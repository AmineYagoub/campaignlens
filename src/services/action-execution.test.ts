import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionDraft, HydratedActionContent } from '../types/action';

const redisStore = new Map<string, string>();
const historyMembers: string[] = [];
const safeGet = vi.fn(async (key: string) => redisStore.get(key));
const safeSet = vi.fn(async (key: string, value: string) => {
  redisStore.set(key, value);
  return true;
});
const safeSetNX = vi.fn(async (key: string, value: string) => {
  if (redisStore.has(key)) return false;
  redisStore.set(key, value);
  return true;
});
const safeExpire = vi.fn(async () => true);
const safeZAdd = vi.fn(async (_key: string, entry: { member: string }) => {
  historyMembers.push(entry.member);
  return true;
});
const safeZRange = vi.fn(async () => historyMembers.map((member) => ({ member, score: 1 })));
const getActionDraft = vi.fn();
const hydrateSelectedContent = vi.fn();
const executeContentModerationAction = vi.fn(async () => undefined);

vi.mock('../devvit/redis-client', () => ({
  safeGet,
  safeSet,
  safeSetNX,
  safeExpire,
  safeZAdd,
  safeZRange,
}));

vi.mock('./action-draft.service', () => ({
  getActionDraft,
}));

vi.mock('./content-hydration.service', () => ({
  hydrateSelectedContent,
}));

vi.mock('../devvit/reddit-client', () => ({
  executeContentModerationAction,
}));

const { executeActionDraft, listActionHistory } = await import('./action-execution.service');

function makeDraft(overrides: Partial<ActionDraft> = {}): ActionDraft {
  const now = Date.now();
  return {
    id: 'draft-1',
    dossierId: 'dossier-1',
    selectedContentIds: ['t3_post'],
    actionKinds: ['REMOVE'],
    items: [
      {
        contentId: 't3_post',
        kind: 'post',
        state: 'AVAILABLE',
        subredditName: 'campaignlens_dev',
      },
    ],
    source: 'MANUAL_REVIEW',
    idempotencyKey: 'idem-1',
    createdAt: now,
    expiresAt: now + 60_000,
    confirmedByModerator: false,
    rollback: {},
    ...overrides,
  };
}

function makeHydrated(overrides: Partial<HydratedActionContent> = {}): HydratedActionContent {
  return {
    contentId: 't3_post',
    kind: 'post',
    state: 'AVAILABLE',
    subredditName: 'campaignlens_dev',
    ...overrides,
  };
}

describe('action execution service', () => {
  beforeEach(() => {
    redisStore.clear();
    historyMembers.length = 0;
    vi.clearAllMocks();
  });

  it('executes a confirmed draft and stores an item-level audit record', async () => {
    getActionDraft.mockResolvedValue(makeDraft());
    hydrateSelectedContent.mockResolvedValue([makeHydrated()]);

    const record = await executeActionDraft({
      draftId: 'draft-1',
      subredditName: 'campaignlens_dev',
      idempotencyKey: 'idem-1',
      confirmedByModerator: true,
    });

    expect(record.result).toBe('SUCCEEDED');
    expect(record.itemResults).toEqual([
      {
        contentId: 't3_post',
        kind: 'post',
        actionKind: 'REMOVE',
        status: 'SUCCEEDED',
      },
    ]);
    expect(record.actorStored).toBe(false);
    expect(record.hydratedAuthorStored).toBe(false);
    expect(executeContentModerationAction).toHaveBeenCalledWith({
      kind: 'post',
      contentId: 't3_post',
      actionKind: 'REMOVE',
    });
  });

  it('returns the previous execution record for a repeated draft', async () => {
    const existing = {
      id: 'execution-1',
      draftId: 'draft-1',
      dossierId: 'dossier-1',
      actionKinds: ['REMOVE'],
      selectedContentCount: 1,
      itemResults: [],
      result: 'SUCCEEDED',
      contentIdsHash: 'a',
      actionKindsHash: 'b',
      createdAt: Date.now(),
      actorStored: false,
      hydratedAuthorStored: false,
    };
    redisStore.set('cl:action:execution:draft:draft-1', JSON.stringify(existing));

    const record = await executeActionDraft({
      draftId: 'draft-1',
      subredditName: 'campaignlens_dev',
      idempotencyKey: 'idem-1',
      confirmedByModerator: true,
    });

    expect(record).toEqual(existing);
    expect(executeContentModerationAction).not.toHaveBeenCalled();
  });

  it('skips deleted content instead of retrying forever', async () => {
    getActionDraft.mockResolvedValue(makeDraft());
    hydrateSelectedContent.mockResolvedValue([
      makeHydrated({ state: 'DELETED', reason: 'Post is deleted.' }),
    ]);

    const record = await executeActionDraft({
      draftId: 'draft-1',
      subredditName: 'campaignlens_dev',
      idempotencyKey: 'idem-1',
      confirmedByModerator: true,
    });

    expect(record.result).toBe('PARTIAL');
    expect(record.itemResults[0]).toMatchObject({
      status: 'SKIPPED',
      message: 'Post is deleted.',
    });
    expect(executeContentModerationAction).not.toHaveBeenCalled();
  });

  it('rejects execution without the draft idempotency key', async () => {
    getActionDraft.mockResolvedValue(makeDraft());

    await expect(
      executeActionDraft({
        draftId: 'draft-1',
        subredditName: 'campaignlens_dev',
        idempotencyKey: 'wrong',
        confirmedByModerator: true,
      })
    ).rejects.toThrow('idempotency key');
  });

  it('lists persisted action history', async () => {
    getActionDraft.mockResolvedValue(makeDraft());
    hydrateSelectedContent.mockResolvedValue([makeHydrated()]);
    const record = await executeActionDraft({
      draftId: 'draft-1',
      subredditName: 'campaignlens_dev',
      idempotencyKey: 'idem-1',
      confirmedByModerator: true,
    });

    await expect(listActionHistory()).resolves.toEqual([record]);
  });

  it('fails execution when the audit record cannot be persisted', async () => {
    getActionDraft.mockResolvedValue(makeDraft());
    hydrateSelectedContent.mockResolvedValue([makeHydrated()]);
    safeSet.mockResolvedValueOnce(false);

    await expect(
      executeActionDraft({
        draftId: 'draft-1',
        subredditName: 'campaignlens_dev',
        idempotencyKey: 'idem-1',
        confirmedByModerator: true,
      })
    ).rejects.toThrow('persist action execution record');
  });
});
