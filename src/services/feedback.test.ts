import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, type CampaignLensConfig } from '../types/config';
import type { EvidenceDossier } from '../types/dossier';
import type { PrecisionStats } from '../types/feedback';

let config: CampaignLensConfig;
const redisStore = new Map<string, string>();
const getConfig = vi.fn(async () => config);
const saveConfig = vi.fn(async (next: CampaignLensConfig) => {
  config = next;
  return next;
});
const getDossier = vi.fn();
const updateDossierStatus = vi.fn(async () => undefined);
const getEvidenceForContent = vi.fn();
const safeGet = vi.fn(async (key: string) => redisStore.get(key));
const safeSet = vi.fn(async (key: string, value: string) => {
  redisStore.set(key, value);
  return true;
});
const safeExpire = vi.fn(async () => true);
const safeZAdd = vi.fn(async () => true);

vi.mock('./config.service', () => ({
  getConfig,
  saveConfig,
}));

vi.mock('./dossier.service', () => ({
  getDossier,
  updateDossierStatus,
}));

vi.mock('./content-ingestion.service', () => ({
  getEvidenceForContent,
}));

vi.mock('../devvit/redis-client', () => ({
  safeGet,
  safeSet,
  safeExpire,
  safeZAdd,
}));

const {
  handleFeedback,
  handleModAction,
} = await import('./feedback.service');

function makeDossier(overrides: Partial<EvidenceDossier> = {}): EvidenceDossier {
  return {
    id: 'dossier-1',
    clusterKey: 'domain:example.com',
    category: 'COMMERCIAL_PROMOTION',
    status: 'NEEDS_REVIEW',
    score: {
      total: 88,
      domainBurst: 75,
      brandBurst: 100,
      threadSpread: 100,
      simhash: 0,
      participationPattern: 90,
      obfuscation: 100,
      report: 0,
      independentSignalFamilies: 5,
      localBaselineZScore: 0,
    },
    signalKey: 'domain:example.com',
    examples: [],
    timeline: [],
    explanationBullets: [],
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

describe('feedback service', () => {
  beforeEach(() => {
    config = structuredClone(DEFAULT_CONFIG);
    redisStore.clear();
    vi.clearAllMocks();
  });

  it('decreases the strongest weight for benign feedback', async () => {
    getDossier.mockResolvedValue(makeDossier({ signalKey: 'brand:example' }));
    const before = config.weights.domainBurst;

    await handleFeedback('dossier-1', 'BENIGN');

    expect(config.weights.domainBurst).toBeCloseTo(before - 0.02);
    expect(saveConfig).toHaveBeenCalledTimes(1);
    expect(updateDossierStatus).toHaveBeenCalledWith('dossier-1', 'BENIGN');
  });

  it('caps confirmed campaign increases by signal family', async () => {
    config.weights.domainBurst = 0.39;
    config.weights.brandBurst = 0.39;
    getEvidenceForContent.mockResolvedValue({
      signalKeys: ['domain:example.com', 'brand:example'],
    });

    await handleModAction({ action: 'remove', targetId: 't3_post' });

    expect(config.weights.domainBurst).toBe(0.4);
    expect(config.weights.brandBurst).toBe(0.4);
    expect(saveConfig).toHaveBeenCalledTimes(1);
  });

  it('records feedback, updates precision stats, adjusts weights, and updates dossier status', async () => {
    getDossier.mockResolvedValue(makeDossier());

    await handleFeedback('dossier-1', 'CONFIRMED_CAMPAIGN');

    const stats = JSON.parse(redisStore.get('cl:precision') ?? '{}') as PrecisionStats;
    expect(stats.confirmedCampaign).toBe(1);
    expect(stats.reviewedHighConfidence).toBe(1);
    expect(config.weights.domainBurst).toBeCloseTo(DEFAULT_CONFIG.weights.domainBurst + 0.02);
    expect(updateDossierStatus).toHaveBeenCalledWith('dossier-1', 'CONFIRMED');
  });

  it('maps non-weight feedback to the expected review statuses', async () => {
    getDossier.mockResolvedValue(makeDossier());

    await handleFeedback('dossier-1', 'WATCH');
    await handleFeedback('dossier-1', 'IGNORE');
    await handleFeedback('dossier-1', 'FALSE_POSITIVE');
    await handleFeedback('dossier-1', 'ESCALATE');

    expect(updateDossierStatus).toHaveBeenCalledWith('dossier-1', 'WATCH');
    expect(updateDossierStatus).toHaveBeenCalledWith('dossier-1', 'IGNORED');
    expect(updateDossierStatus).toHaveBeenCalledWith('dossier-1', 'ESCALATED');
  });

  it('batches mod action weight changes into a single config write', async () => {
    getEvidenceForContent.mockResolvedValue({
      signalKeys: ['domain:example.com', 'brand:example'],
    });

    await handleModAction({ action: 'remove', targetId: 't3_post' });

    expect(config.weights.domainBurst).toBeCloseTo(DEFAULT_CONFIG.weights.domainBurst + 0.02);
    expect(config.weights.brandBurst).toBeCloseTo(DEFAULT_CONFIG.weights.brandBurst + 0.02);
    expect(saveConfig).toHaveBeenCalledTimes(1);
  });

  it('ignores unrelated mod actions', async () => {
    await handleModAction({ action: 'lock', targetId: 't3_post' });

    expect(getEvidenceForContent).not.toHaveBeenCalled();
    expect(saveConfig).not.toHaveBeenCalled();
  });
});
