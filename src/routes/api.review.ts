import { Hono } from 'hono';
import {
  createReviewEvent,
  listReviewEvents,
  listReviewQueue,
  REVIEW_EVENT_TYPES,
  type ReviewQueueFilters,
} from '../services/review-queue.service';
import type { DossierStatus, ReviewEventType } from '../types/dossier';
import { DOSSIER_STATUSES } from '../types/dossier';
import { readJsonBody } from './request';

export const apiReview = new Hono().basePath('/api/review');

apiReview.get('/queue', async (c) => {
  try {
    const rawStatus = c.req.query('status');
    let status: DossierStatus | undefined;
    if (rawStatus) {
      if (!isDossierStatus(rawStatus)) {
        return c.json({ error: 'Invalid dossier status' }, 400);
      }
      status = rawStatus;
    }

    const minScore = parseOptionalNumber(c.req.query('minScore'));
    const maxAgeHours = parseOptionalNumber(c.req.query('maxAgeHours'));
    const limit = parseOptionalNumber(c.req.query('limit'));
    const signal = c.req.query('signal');

    const filters: ReviewQueueFilters = {
      ...(status ? { status } : {}),
      ...(signal ? { signal } : {}),
      ...(minScore !== undefined ? { minScore } : {}),
      ...(maxAgeHours !== undefined ? { maxAgeHours } : {}),
      ...(limit !== undefined ? { limit } : {}),
    };

    const items = await listReviewQueue(filters);

    return c.json(items);
  } catch {
    return c.json({ error: 'Failed to fetch review queue' }, 500);
  }
});

apiReview.get('/dossiers/:id/events', async (c) => {
  try {
    const id = c.req.param('id');
    const limit = parseOptionalNumber(c.req.query('limit')) ?? 50;
    return c.json(await listReviewEvents(id, limit));
  } catch {
    return c.json({ error: 'Failed to fetch review events' }, 500);
  }
});

apiReview.post('/dossiers/:id/events', async (c) => {
  const id = c.req.param('id');
  const body = await readJsonBody<{
    type?: unknown;
    note?: unknown;
    proposedAction?: unknown;
  }>(c);
  if (body instanceof Response) return body;

  if (typeof body.type !== 'string' || !REVIEW_EVENT_TYPES.includes(body.type as ReviewEventType)) {
    return c.json({ error: 'Invalid review event type' }, 400);
  }

  try {
    const event = await createReviewEvent({
      dossierId: id,
      type: body.type as ReviewEventType,
      ...(typeof body.note === 'string' ? { note: body.note } : {}),
      ...(typeof body.proposedAction === 'string' ? { proposedAction: body.proposedAction } : {}),
    });
    return c.json(event);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Review event failed' }, 400);
  }
});

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isDossierStatus(value: string): value is DossierStatus {
  return DOSSIER_STATUSES.includes(value as DossierStatus);
}
