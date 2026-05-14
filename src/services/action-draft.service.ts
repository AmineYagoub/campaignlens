import { safeDel, safeGet, safeSet, safeExpire } from '../devvit/redis-client';
import { ACTION_ROLLBACK, assertPreviewPolicy } from './enforcement-policy.service';
import { hydrateSelectedContent } from './content-hydration.service';
import { actionDraftKey } from './redis-keys.service';
import { generateEventId, fnv1a64 } from '../utils/hashing';
import type {
  ActionDraft,
  ActionDraftContent,
  ActionPreview,
  EnforcementActionKind,
  HydratedActionContent,
} from '../types/action';

const ACTION_DRAFT_TTL_SECONDS = 15 * 60;

export type CreateActionPreviewInput = {
  dossierId: string;
  selectedContentIds: string[];
  actionKinds: EnforcementActionKind[];
  subredditName: string;
  idempotencyKey?: string;
  removalReasonId?: string;
  removalNote?: string;
  snoozeReason?: string;
};

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function persistedContent(content: HydratedActionContent): ActionDraftContent {
  const { authorName: _authorName, ...persisted } = content;
  return persisted;
}

function makeIdempotencyKey(input: CreateActionPreviewInput, selectedContentIds: string[]): string {
  if (input.idempotencyKey?.trim()) return input.idempotencyKey.trim();
  const keyMaterial = [
    input.dossierId,
    selectedContentIds.sort().join(','),
    [...input.actionKinds].sort().join(','),
  ].join('|');
  return fnv1a64(keyMaterial).toString(16);
}

function assertDraftConfiguration(input: CreateActionPreviewInput): void {
  if (input.actionKinds.includes('ADD_REMOVAL_NOTE') && !input.removalReasonId?.trim()) {
    throw new Error('ADD_REMOVAL_NOTE requires removalReasonId.');
  }

  if (input.actionKinds.includes('SNOOZE_REPORTS') && !input.snoozeReason?.trim()) {
    throw new Error('SNOOZE_REPORTS requires snoozeReason.');
  }
}

export async function createActionPreview(input: CreateActionPreviewInput): Promise<ActionPreview> {
  const selectedContentIds = unique(input.selectedContentIds);
  assertPreviewPolicy({
    source: 'MANUAL_REVIEW',
    actionKinds: input.actionKinds,
    selectedContentIds,
  });
  assertDraftConfiguration(input);

  const hydrated = await hydrateSelectedContent(selectedContentIds, input.subredditName);
  const outOfScope = hydrated.find((item) => item.state === 'OUT_OF_SCOPE');
  if (outOfScope) {
    throw new Error(`Content ${outOfScope.contentId} is outside r/${input.subredditName}.`);
  }

  const actionableItems = hydrated.filter((item) => item.state === 'AVAILABLE');
  if (actionableItems.length === 0) {
    throw new Error('No selected content is currently available for action.');
  }

  const now = Date.now();
  const draft: ActionDraft = {
    id: `action-draft-${generateEventId()}`,
    dossierId: input.dossierId,
    selectedContentIds,
    actionKinds: input.actionKinds,
    items: actionableItems.map(persistedContent),
    ...(input.removalReasonId?.trim() ? { removalReasonId: input.removalReasonId.trim() } : {}),
    ...(input.removalNote?.trim() ? { removalNote: input.removalNote.trim().slice(0, 100) } : {}),
    ...(input.snoozeReason?.trim() ? { snoozeReason: input.snoozeReason.trim() } : {}),
    source: 'MANUAL_REVIEW',
    idempotencyKey: makeIdempotencyKey(input, selectedContentIds),
    createdAt: now,
    expiresAt: now + ACTION_DRAFT_TTL_SECONDS * 1000,
    confirmedByModerator: false,
    rollback: Object.fromEntries(
      input.actionKinds.map((actionKind) => [actionKind, ACTION_ROLLBACK[actionKind]])
    ) as ActionDraft['rollback'],
  };

  const wrote = await safeSet(actionDraftKey(draft.id), JSON.stringify(draft));
  if (!wrote) {
    throw new Error('Failed to persist action draft.');
  }
  await safeExpire(actionDraftKey(draft.id), ACTION_DRAFT_TTL_SECONDS);

  return {
    draft,
    items: hydrated,
    skippedItems: hydrated.filter((item) => item.state !== 'AVAILABLE'),
  };
}

export async function getActionDraft(id: string): Promise<ActionDraft | null> {
  const json = await safeGet(actionDraftKey(id));
  if (!json) return null;

  try {
    return JSON.parse(json) as ActionDraft;
  } catch {
    return null;
  }
}

export async function deleteActionDraft(id: string): Promise<boolean> {
  return safeDel(actionDraftKey(id));
}
