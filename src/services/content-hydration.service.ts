import { getCommentById, getPostById } from '../devvit/reddit-client';
import type { ActionContentKind, HydratedActionContent } from '../types/action';
import { createShortExcerpt } from '../utils/excerpt';

function inferContentKind(contentId: string): ActionContentKind | null {
  if (contentId.startsWith('t3_')) return 'post';
  if (contentId.startsWith('t1_')) return 'comment';
  return null;
}

function normalizeSubredditName(name: string): string {
  return name.trim().toLowerCase();
}

function outOfScopeIfNeeded(
  content: HydratedActionContent,
  expectedSubredditName: string
): HydratedActionContent {
  if (
    content.subredditName &&
    normalizeSubredditName(content.subredditName) !== normalizeSubredditName(expectedSubredditName)
  ) {
    return {
      ...content,
      state: 'OUT_OF_SCOPE',
      reason: 'Content belongs to a different subreddit.',
    };
  }

  return content;
}

async function hydratePost(contentId: string, expectedSubredditName: string): Promise<HydratedActionContent> {
  const post = await getPostById(contentId);
  const body = post.body ?? '';
  const content: HydratedActionContent = {
    contentId,
    kind: 'post',
    state: post.removed || post.removedByCategory === 'deleted' ? 'DELETED' : 'AVAILABLE',
    subredditName: post.subredditName,
    permalink: post.permalink,
    title: post.title,
    excerpt: createShortExcerpt(body || post.title),
    authorName: post.authorName,
    removed: post.removed,
    spam: post.spam,
    locked: post.locked,
    reportCount: post.numberOfReports,
    ...(post.removedByCategory === 'deleted' ? { reason: 'Post is deleted.' } : {}),
  };

  return outOfScopeIfNeeded(content, expectedSubredditName);
}

async function hydrateComment(contentId: string, expectedSubredditName: string): Promise<HydratedActionContent> {
  const comment = await getCommentById(contentId);
  const content: HydratedActionContent = {
    contentId,
    kind: 'comment',
    state: comment.removed ? 'DELETED' : 'AVAILABLE',
    subredditName: comment.subredditName,
    permalink: comment.permalink,
    excerpt: createShortExcerpt(comment.body),
    authorName: comment.authorName,
    removed: comment.removed,
    spam: comment.spam,
    locked: comment.locked,
    reportCount: comment.numReports,
    ...(comment.removed ? { reason: 'Comment is removed or deleted.' } : {}),
  };

  return outOfScopeIfNeeded(content, expectedSubredditName);
}

export async function hydrateSelectedContent(
  contentIds: string[],
  expectedSubredditName: string
): Promise<HydratedActionContent[]> {
  const hydrated: HydratedActionContent[] = [];

  for (const contentId of contentIds) {
    const kind = inferContentKind(contentId);
    if (!kind) {
      hydrated.push({
        contentId,
        kind: 'comment',
        state: 'UNAVAILABLE',
        reason: 'Unsupported Reddit content ID.',
      });
      continue;
    }

    try {
      hydrated.push(
        kind === 'post'
          ? await hydratePost(contentId, expectedSubredditName)
          : await hydrateComment(contentId, expectedSubredditName)
      );
    } catch (error) {
      hydrated.push({
        contentId,
        kind,
        state: 'UNAVAILABLE',
        reason: error instanceof Error ? error.message : 'Content could not be hydrated.',
      });
    }
  }

  return hydrated;
}
