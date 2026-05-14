import { executeContentModerationAction } from '../devvit/reddit-client';
import { safeExpire, safeGet, safeSet, safeSetNX, safeZAdd, safeZRange } from '../devvit/redis-client';
import { hydrateSelectedContent } from './content-hydration.service';
import { assertModeratorConfirmation, assertPreviewPolicy } from './enforcement-policy.service';
import { getActionDraft } from './action-draft.service';
import {
  ACTION_HISTORY_KEY,
  actionExecutionByDraftKey,
  actionExecutionKey,
  actionExecutionLockKey,
} from './redis-keys.service';
import { fnv1a64, generateEventId } from '../utils/hashing';
import type {
  ActionDraft,
  ActionExecutionLock,
  ActionExecutionRecord,
  ActionItemResult,
  EnforcementActionKind,
  HydratedActionContent,
} from '../types/action';

const ACTION_EXECUTION_TTL_SECONDS = 180 * 24 * 3600;
const ACTION_EXECUTION_LOCK_TTL_SECONDS = 5 * 60;

export type ExecuteActionDraftInput = {
  draftId: string;
  subredditName: string;
  idempotencyKey: string;
  confirmedByModerator: boolean;
};

function stableHash(values: string[]): string {
  return fnv1a64([...values].sort().join('|')).toString(16);
}

function parseExecutionRecord(json: string | undefined): ActionExecutionRecord | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as ActionExecutionRecord;
  } catch {
    return null;
  }
}

function summarizeResults(results: ActionItemResult[]): ActionExecutionRecord['result'] {
  const succeeded = results.some((result) => result.status === 'SUCCEEDED');
  const failed = results.some((result) => result.status === 'FAILED');
  const skipped = results.some((result) => result.status === 'SKIPPED');

  if (succeeded && !failed && !skipped) return 'SUCCEEDED';
  if (succeeded) return 'PARTIAL';
  if (skipped && !failed) return 'PARTIAL';
  return 'FAILED';
}

function skippedResults(item: HydratedActionContent, actionKinds: EnforcementActionKind[]): ActionItemResult[] {
  return actionKinds.map((actionKind) => ({
    contentId: item.contentId,
    kind: item.kind,
    actionKind,
    status: 'SKIPPED',
    message: item.reason ?? `Content state is ${item.state}.`,
  }));
}

async function executeItemActions(
  draft: ActionDraft,
  item: HydratedActionContent
): Promise<ActionItemResult[]> {
  const results: ActionItemResult[] = [];

  for (const actionKind of draft.actionKinds) {
    try {
      await executeContentModerationAction({
        kind: item.kind,
        contentId: item.contentId,
        actionKind,
        ...(draft.removalReasonId ? { removalReasonId: draft.removalReasonId } : {}),
        ...(draft.removalNote ? { removalNote: draft.removalNote } : {}),
        ...(draft.snoozeReason ? { snoozeReason: draft.snoozeReason } : {}),
      });
      results.push({
        contentId: item.contentId,
        kind: item.kind,
        actionKind,
        status: 'SUCCEEDED',
      });
    } catch (error) {
      results.push({
        contentId: item.contentId,
        kind: item.kind,
        actionKind,
        status: 'FAILED',
        message: error instanceof Error ? error.message : 'Moderation action failed.',
      });
    }
  }

  return results;
}

async function persistExecution(record: ActionExecutionRecord): Promise<void> {
  const json = JSON.stringify(record);
  const wroteExecution = await safeSet(actionExecutionKey(record.id), json);
  if (!wroteExecution) throw new Error('Failed to persist action execution record.');
  await safeExpire(actionExecutionKey(record.id), ACTION_EXECUTION_TTL_SECONDS);

  const wroteDraftIndex = await safeSet(actionExecutionByDraftKey(record.draftId), json);
  if (!wroteDraftIndex) throw new Error('Failed to persist action execution idempotency record.');
  await safeExpire(actionExecutionByDraftKey(record.draftId), ACTION_EXECUTION_TTL_SECONDS);

  const wroteHistory = await safeZAdd(ACTION_HISTORY_KEY, { member: record.id, score: record.createdAt });
  if (!wroteHistory) throw new Error('Failed to persist action execution history index.');
  await safeExpire(ACTION_HISTORY_KEY, ACTION_EXECUTION_TTL_SECONDS);
}

export async function executeActionDraft(input: ExecuteActionDraftInput): Promise<ActionExecutionRecord> {
  const existingRecord = parseExecutionRecord(await safeGet(actionExecutionByDraftKey(input.draftId)));
  if (existingRecord) return existingRecord;

  const draft = await getActionDraft(input.draftId);
  if (!draft) {
    throw new Error('Action draft not found.');
  }

  if (Date.now() > draft.expiresAt) {
    throw new Error('Action draft expired.');
  }

  if (!input.idempotencyKey || input.idempotencyKey !== draft.idempotencyKey) {
    throw new Error('Execution idempotency key does not match the action draft.');
  }

  assertPreviewPolicy({
    source: draft.source,
    actionKinds: draft.actionKinds,
    selectedContentIds: draft.selectedContentIds,
  });
  assertModeratorConfirmation({
    source: draft.source,
    actionKinds: draft.actionKinds,
    selectedContentIds: draft.selectedContentIds,
    confirmedByModerator: input.confirmedByModerator,
  });

  const contentIdsHash = stableHash(draft.selectedContentIds);
  const actionKindsHash = stableHash(draft.actionKinds);
  const lock: ActionExecutionLock = {
    draftId: draft.id,
    dossierId: draft.dossierId,
    contentIdsHash,
    actionKindsHash,
    expiresAt: Date.now() + ACTION_EXECUTION_LOCK_TTL_SECONDS * 1000,
  };
  const locked = await safeSetNX(
    actionExecutionLockKey(draft.id),
    JSON.stringify(lock),
    ACTION_EXECUTION_LOCK_TTL_SECONDS
  );
  if (!locked) {
    const maybeCompleted = parseExecutionRecord(await safeGet(actionExecutionByDraftKey(input.draftId)));
    if (maybeCompleted) return maybeCompleted;
    throw new Error('Action draft execution is already in progress.');
  }

  const hydratedItems = await hydrateSelectedContent(draft.selectedContentIds, input.subredditName);
  const itemResults: ActionItemResult[] = [];

  for (const item of hydratedItems) {
    if (item.state !== 'AVAILABLE') {
      itemResults.push(...skippedResults(item, draft.actionKinds));
      continue;
    }

    itemResults.push(...await executeItemActions(draft, item));
  }

  const record: ActionExecutionRecord = {
    id: `action-execution-${generateEventId()}`,
    draftId: draft.id,
    dossierId: draft.dossierId,
    actionKinds: draft.actionKinds,
    selectedContentCount: draft.selectedContentIds.length,
    itemResults,
    result: summarizeResults(itemResults),
    contentIdsHash,
    actionKindsHash,
    createdAt: Date.now(),
    actorStored: false,
    hydratedAuthorStored: false,
  };

  await persistExecution(record);
  return record;
}

export async function listActionHistory(limit = 50): Promise<ActionExecutionRecord[]> {
  const entries = await safeZRange(ACTION_HISTORY_KEY, 0, Math.max(0, limit - 1), {
    reverse: true,
    by: 'rank',
  });
  const records: ActionExecutionRecord[] = [];

  for (const entry of entries) {
    const record = parseExecutionRecord(await safeGet(actionExecutionKey(entry.member)));
    if (record) records.push(record);
  }

  return records;
}
