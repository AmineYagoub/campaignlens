import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HydratedActionContent } from '../types/action';

const redisStore = new Map<string, string>();
const safeSet = vi.fn(async (key: string, value: string) => {
  redisStore.set(key, value);
  return true;
});
const safeExpire = vi.fn(async () => true);
const safeGet = vi.fn(async (key: string) => redisStore.get(key));
const safeDel = vi.fn(async (key: string) => redisStore.delete(key));
const hydrateSelectedContent = vi.fn();

vi.mock('../devvit/redis-client', () => ({
  safeSet,
  safeExpire,
  safeGet,
  safeDel,
}));

vi.mock('./content-hydration.service', () => ({
  hydrateSelectedContent,
}));

const { createActionPreview, deleteActionDraft, getActionDraft } = await import('./action-draft.service');

describe('action draft service', () => {
  beforeEach(() => {
    redisStore.clear();
    vi.clearAllMocks();
  });

  it('creates a draft without persisting hydrated author identity', async () => {
    const hydrated: HydratedActionContent = {
      contentId: 't3_post',
      kind: 'post',
      state: 'AVAILABLE',
      subredditName: 'campaignlens_dev',
      permalink: '/r/campaignlens_dev/comments/post',
      title: 'Test post',
      excerpt: 'Test post excerpt',
      authorName: 'temporary_author',
      removed: false,
      spam: false,
      locked: false,
      reportCount: 0,
    };
    hydrateSelectedContent.mockResolvedValue([hydrated]);

    const preview = await createActionPreview({
      dossierId: 'dossier-1',
      selectedContentIds: ['t3_post'],
      actionKinds: ['REMOVE'],
      subredditName: 'campaignlens_dev',
    });

    expect(preview.items[0]?.authorName).toBe('temporary_author');
    expect(preview.draft.items[0]).not.toHaveProperty('authorName');
    expect(safeSet).toHaveBeenCalledOnce();
    const storedDraft = JSON.parse(safeSet.mock.calls[0]![1]);
    expect(JSON.stringify(storedDraft)).not.toContain('temporary_author');
  });

  it('rejects cross-subreddit content', async () => {
    hydrateSelectedContent.mockResolvedValue([
      {
        contentId: 't3_post',
        kind: 'post',
        state: 'OUT_OF_SCOPE',
        subredditName: 'other_subreddit',
      },
    ]);

    await expect(
      createActionPreview({
        dossierId: 'dossier-1',
        selectedContentIds: ['t3_post'],
        actionKinds: ['REMOVE'],
        subredditName: 'campaignlens_dev',
      })
    ).rejects.toThrow('outside r/campaignlens_dev');
  });

  it('can retrieve and delete a persisted draft', async () => {
    hydrateSelectedContent.mockResolvedValue([
      {
        contentId: 't1_comment',
        kind: 'comment',
        state: 'AVAILABLE',
        subredditName: 'campaignlens_dev',
      },
    ]);

    const preview = await createActionPreview({
      dossierId: 'dossier-1',
      selectedContentIds: ['t1_comment'],
      actionKinds: ['APPROVE'],
      subredditName: 'campaignlens_dev',
    });

    await expect(getActionDraft(preview.draft.id)).resolves.toEqual(preview.draft);
    await expect(deleteActionDraft(preview.draft.id)).resolves.toBe(true);
    await expect(getActionDraft(preview.draft.id)).resolves.toBeNull();
  });
});
