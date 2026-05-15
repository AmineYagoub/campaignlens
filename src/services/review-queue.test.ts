import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DossierSummary, EvidenceDossier } from '../types/dossier';

const reviewEvents = new Map<string, Array<{ member: string; score: number }>>();
const safeZAdd = vi.fn(async (key: string, entry: { member: string; score: number }) => {
  const existing = reviewEvents.get(key) ?? [];
  reviewEvents.set(key, [...existing, { ...entry, score: entry.score + existing.length }]);
  return true;
});
const safeZRange = vi.fn(async (key: string, start: number, stop: number) => {
  const entries = [...(reviewEvents.get(key) ?? [])].sort((a, b) => b.score - a.score);
  const end = stop < 0 ? entries.length : stop + 1;
  return entries.slice(start, end);
});
const safeExpire = vi.fn(async () => true);
const getDossier = vi.fn();
const updateDossierStatus = vi.fn(async () => null);
const listActiveDossiers = vi.fn();

vi.mock('../devvit/redis-client', () => ({
  safeZAdd,
  safeZRange,
  safeExpire,
}));

vi.mock('./dossier.service', () => ({
  getDossier,
  updateDossierStatus,
  listActiveDossiers,
}));

const {
  createReviewEvent,
  listReviewEvents,
  listReviewQueue,
} = await import('./review-queue.service');

const dossier: EvidenceDossier = {
  id: 'dossier-1',
  clusterKey: 'domain:example.com',
  category: 'COMMERCIAL_PROMOTION',
  status: 'NEEDS_REVIEW',
  score: {
    total: 70,
    domainBurst: 75,
    brandBurst: 0,
    threadSpread: 40,
    simhash: 0,
    participationPattern: 0,
    obfuscation: 0,
    report: 0,
    independentSignalFamilies: 3,
    localBaselineZScore: 0,
  },
  signalKey: 'domain:example.com',
  examples: [],
  timeline: [],
  explanationBullets: [],
  createdAt: 1000,
  updatedAt: 2000,
};

const summary: DossierSummary = {
  id: 'dossier-1',
  clusterKey: 'domain:example.com',
  category: 'COMMERCIAL_PROMOTION',
  status: 'NEEDS_REVIEW',
  totalScore: 70,
  signalKey: 'domain:example.com',
  exampleCount: 3,
  createdAt: 1000,
  updatedAt: Date.now(),
};

describe('review queue service', () => {
  beforeEach(() => {
    reviewEvents.clear();
    vi.clearAllMocks();
    getDossier.mockResolvedValue(dossier);
    listActiveDossiers.mockResolvedValue([summary]);
  });

  it('records a privacy-safe claim event and marks dossier under review', async () => {
    const event = await createReviewEvent({
      dossierId: 'dossier-1',
      type: 'CLAIM',
    });

    expect(event.type).toBe('CLAIM');
    expect(updateDossierStatus).toHaveBeenCalledWith('dossier-1', 'UNDER_REVIEW');
    expect(JSON.stringify(event)).not.toMatch(/user|author|moderator/i);
  });

  it('requires notes for note review events', async () => {
    await expect(
      createReviewEvent({
        dossierId: 'dossier-1',
        type: 'NOTE',
      })
    ).rejects.toThrow('require a note');
  });

  it('lists queue items with latest review event', async () => {
    await createReviewEvent({
      dossierId: 'dossier-1',
      type: 'REQUEST_SECOND_REVIEW',
    });

    const queue = await listReviewQueue({ minScore: 60 });

    expect(queue).toHaveLength(1);
    expect(queue[0]?.latestReviewEvent?.type).toBe('REQUEST_SECOND_REVIEW');
  });

  it('filters queue items by status and signal', async () => {
    await expect(listReviewQueue({ status: 'WATCH' })).resolves.toEqual([]);
    await expect(listReviewQueue({ signal: 'example.com' })).resolves.toHaveLength(1);
  });

  it('lists review events newest first', async () => {
    await createReviewEvent({ dossierId: 'dossier-1', type: 'CLAIM' });
    await createReviewEvent({ dossierId: 'dossier-1', type: 'RELEASE' });

    const events = await listReviewEvents('dossier-1');

    expect(events[0]?.type).toBe('RELEASE');
    expect(events[1]?.type).toBe('CLAIM');
  });
});
