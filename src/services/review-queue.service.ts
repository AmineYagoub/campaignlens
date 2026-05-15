import type {
  DossierStatus,
  ReviewEvent,
  ReviewEventType,
  ReviewQueueItem,
} from '../types/dossier';
import { getDossier, listActiveDossiers, updateDossierStatus } from './dossier.service';
import { reviewEventsKey } from './redis-keys.service';
import { TTL } from './ttl.service';
import { safeExpire, safeZAdd, safeZRange } from '../devvit/redis-client';

export const REVIEW_EVENT_TYPES: ReviewEventType[] = [
  'CLAIM',
  'RELEASE',
  'NOTE',
  'REQUEST_SECOND_REVIEW',
  'PROPOSE_ACTION',
];

export type CreateReviewEventInput = {
  dossierId: string;
  type: ReviewEventType;
  note?: string;
  proposedAction?: string;
};

export type ReviewQueueFilters = {
  status?: DossierStatus;
  signal?: string;
  minScore?: number;
  maxAgeHours?: number;
  limit?: number;
};

export async function createReviewEvent(input: CreateReviewEventInput): Promise<ReviewEvent> {
  const dossier = await getDossier(input.dossierId);
  if (!dossier) throw new Error('Dossier not found.');

  const now = Date.now();
  const event: ReviewEvent = {
    id: `review-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    dossierId: input.dossierId,
    type: input.type,
    createdAt: now,
    ...optionalString('note', sanitizeNote(input.note)),
    ...optionalString('proposedAction', sanitizeProposedAction(input.proposedAction)),
  };

  assertReviewEvent(event);

  const key = reviewEventsKey(input.dossierId);
  const wrote = await safeZAdd(key, { member: JSON.stringify(event), score: event.createdAt });
  if (!wrote) throw new Error('Could not persist review event.');
  await safeExpire(key, TTL.DOSSIER_DAYS);

  if (event.type === 'CLAIM') {
    await updateDossierStatus(input.dossierId, 'UNDER_REVIEW');
  } else if (event.type === 'RELEASE') {
    await updateDossierStatus(input.dossierId, 'NEEDS_REVIEW');
  }

  return event;
}

export async function listReviewEvents(dossierId: string, limit = 50): Promise<ReviewEvent[]> {
  const entries = await safeZRange(reviewEventsKey(dossierId), 0, Math.max(0, limit - 1), {
    reverse: true,
    by: 'rank',
  });
  const events: ReviewEvent[] = [];

  for (const entry of entries) {
    const event = parseReviewEvent(entry.member);
    if (event) events.push(event);
  }

  return events;
}

export async function listReviewQueue(filters: ReviewQueueFilters = {}): Promise<ReviewQueueItem[]> {
  const summaries = await listActiveDossiers();
  const now = Date.now();
  const signalFilter = filters.signal?.trim().toLowerCase();
  const maxAgeMs = typeof filters.maxAgeHours === 'number' ? filters.maxAgeHours * 3600_000 : undefined;
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  const items: ReviewQueueItem[] = [];

  for (const summary of summaries) {
    if (filters.status && summary.status !== filters.status) continue;
    if (typeof filters.minScore === 'number' && summary.totalScore < filters.minScore) continue;
    if (maxAgeMs !== undefined && now - summary.updatedAt > maxAgeMs) continue;
    if (signalFilter && !summary.signalKey.toLowerCase().includes(signalFilter)) continue;

    const latestReviewEvent = (await listReviewEvents(summary.id, 1))[0];
    items.push({
      ...summary,
      ...optionalEvent(latestReviewEvent),
    });
  }

  return items
    .sort((a, b) => b.totalScore - a.totalScore || b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

function assertReviewEvent(event: ReviewEvent): void {
  if (!REVIEW_EVENT_TYPES.includes(event.type)) {
    throw new Error(`Invalid review event type: ${event.type}`);
  }

  if (event.type === 'NOTE' && !event.note) {
    throw new Error('NOTE review events require a note.');
  }

  if (event.type === 'PROPOSE_ACTION' && !event.proposedAction) {
    throw new Error('PROPOSE_ACTION review events require proposedAction.');
  }
}

function sanitizeNote(note: string | undefined): string | undefined {
  const value = note?.trim().replace(/\s+/g, ' ').slice(0, 500);
  return value || undefined;
}

function sanitizeProposedAction(action: string | undefined): string | undefined {
  const value = action?.trim().replace(/[^A-Z_]/gi, '_').toUpperCase().slice(0, 80);
  return value || undefined;
}

function optionalString<K extends string>(key: K, value: string | undefined): Record<K, string> | object {
  return value ? { [key]: value } as Record<K, string> : {};
}

function optionalEvent(event: ReviewEvent | undefined): { latestReviewEvent: ReviewEvent } | object {
  return event ? { latestReviewEvent: event } : {};
}

function parseReviewEvent(json: string): ReviewEvent | null {
  try {
    const parsed = JSON.parse(json) as Partial<ReviewEvent>;
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.dossierId !== 'string' ||
      typeof parsed.createdAt !== 'number' ||
      !REVIEW_EVENT_TYPES.includes(parsed.type as ReviewEventType)
    ) {
      return null;
    }

    return {
      id: parsed.id,
      dossierId: parsed.dossierId,
      type: parsed.type as ReviewEventType,
      createdAt: parsed.createdAt,
      ...optionalString('note', sanitizeNote(parsed.note)),
      ...optionalString('proposedAction', sanitizeProposedAction(parsed.proposedAction)),
    };
  } catch {
    return null;
  }
}
