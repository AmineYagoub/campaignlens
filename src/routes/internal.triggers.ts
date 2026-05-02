import { Hono, type Context } from 'hono';
import { ingestPost, ingestComment, ingestReport, handlePostDelete, handleCommentDelete } from '../services/content-ingestion.service';
import { handleModAction } from '../services/feedback.service';
import { runWithTriggerBudget } from '../services/trigger-budget.service';

export const internalTriggers = new Hono().basePath('/internal/triggers');

async function runTrigger(c: Context, label: string, action: () => Promise<void>) {
  try {
    await runWithTriggerBudget(label, action);
  } catch (error) {
    console.error('CampaignLens trigger failed', { label, error });
  }
  return c.json({}, 200);
}

internalTriggers.post('/on-post-submit', async (c) => {
  return runTrigger(c, 'on-post-submit', async () => {
    const input = await c.req.json();
    await ingestPost(input);
  });
});

internalTriggers.post('/on-comment-submit', async (c) => {
  return runTrigger(c, 'on-comment-submit', async () => {
    const input = await c.req.json();
    await ingestComment(input);
  });
});

internalTriggers.post('/on-post-report', async (c) => {
  return runTrigger(c, 'on-post-report', async () => {
    const input = await c.req.json();
    const targetId = input.targetId ?? input.postId ?? '';
    const reason = input.reason ?? '';
    await ingestReport('post', targetId, reason);
  });
});

internalTriggers.post('/on-comment-report', async (c) => {
  return runTrigger(c, 'on-comment-report', async () => {
    const input = await c.req.json();
    const targetId = input.targetId ?? input.commentId ?? '';
    const reason = input.reason ?? '';
    await ingestReport('comment', targetId, reason);
  });
});

internalTriggers.post('/on-mod-action', async (c) => {
  return runTrigger(c, 'on-mod-action', async () => {
    const input = await c.req.json();
    await handleModAction(input);
  });
});

internalTriggers.post('/on-automod-filter-post', async (c) => {
  return runTrigger(c, 'on-automod-filter-post', async () => {
    const input = await c.req.json();
    await ingestPost(input);
  });
});

internalTriggers.post('/on-automod-filter-comment', async (c) => {
  return runTrigger(c, 'on-automod-filter-comment', async () => {
    const input = await c.req.json();
    await ingestComment(input);
  });
});

internalTriggers.post('/on-app-install', async (c) => {
  return runTrigger(c, 'on-app-install', async () => {
    const input = await c.req.json();
    console.log('CampaignLens Atlas installed to subreddit:', input.subreddit?.name);
  });
});

internalTriggers.post('/on-post-delete', async (c) => {
  return runTrigger(c, 'on-post-delete', async () => {
    const input = await c.req.json();
    const postId = input.postId ?? input.id ?? '';
    if (postId) await handlePostDelete(postId);
  });
});

internalTriggers.post('/on-comment-delete', async (c) => {
  return runTrigger(c, 'on-comment-delete', async () => {
    const input = await c.req.json();
    const commentId = input.commentId ?? input.id ?? '';
    if (commentId) await handleCommentDelete(commentId);
  });
});
