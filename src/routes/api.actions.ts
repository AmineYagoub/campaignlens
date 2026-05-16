import { Hono } from 'hono';
import { getDevvitContext } from '../devvit/context';
import { deleteActionDraft, getActionDraft } from '../services/action-draft.service';
import { executeActionDraft, listActionHistory } from '../services/action-execution.service';
import { readJsonBody } from './request';

export const apiActions = new Hono().basePath('/api/actions');

apiActions.get('/drafts/:id', async (c) => {
  const id = c.req.param('id');
  const draft = await getActionDraft(id);
  if (!draft) {
    return c.json({ error: 'Action draft not found' }, 404);
  }

  return c.json(draft);
});

apiActions.delete('/drafts/:id', async (c) => {
  const id = c.req.param('id');
  const draft = await getActionDraft(id);
  if (!draft) {
    return c.json({ error: 'Action draft not found' }, 404);
  }

  const deleted = await deleteActionDraft(id);
  if (!deleted) {
    return c.json({ error: 'Action draft could not be deleted' }, 500);
  }

  return c.json({ deleted: true });
});

apiActions.post('/drafts/:id/execute', async (c) => {
  const id = c.req.param('id');
  const devvitContext = getDevvitContext();
  if (!devvitContext.subredditName) {
    return c.json({ error: 'Could not resolve current subreddit' }, 400);
  }

  const body = await readJsonBody<{
    idempotencyKey?: unknown;
    confirmedByModerator?: unknown;
  }>(c);
  if (body instanceof Response) return body;

  if (typeof body.idempotencyKey !== 'string' || !body.idempotencyKey.trim()) {
    return c.json({ error: 'idempotencyKey is required' }, 400);
  }

  if (body.confirmedByModerator !== true) {
    return c.json({ error: 'confirmedByModerator must be true' }, 400);
  }

  try {
    const record = await executeActionDraft({
      draftId: id,
      subredditName: devvitContext.subredditName,
      idempotencyKey: body.idempotencyKey,
      confirmedByModerator: true,
    });

    return c.json(record);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Action execution failed' }, 400);
  }
});

apiActions.get('/history', async (c) => {
  const limitParam = c.req.query('limit');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;
  return c.json(await listActionHistory(Number.isFinite(limit) ? limit : 50));
});
