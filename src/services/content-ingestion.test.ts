import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../types/config';

const isDeleted = vi.fn(async () => false);
const isProcessed = vi.fn(async () => false);
const markProcessed = vi.fn(async () => undefined);
const markDeleted = vi.fn(async () => undefined);
const incrementDomain = vi.fn(async () => undefined);
const incrementBrand = vi.fn(async () => undefined);
const incrementSimPrefix = vi.fn(async () => undefined);
const addToHeavyHitters = vi.fn(async () => undefined);
const updateGlobalBaseline = vi.fn(async () => undefined);
const isCandidate = vi.fn(() => ({ isCandidate: true, reasons: ['test'] }));
const getConfig = vi.fn(async () => DEFAULT_CONFIG);
const processEventForClusters = vi.fn(async () => undefined);
const redactEvidenceFromDossiers = vi.fn(async () => undefined);
const safeSet = vi.fn(async () => true);
const safeExpire = vi.fn(async () => true);
const safeZAdd = vi.fn(async () => true);
const safeZCard = vi.fn(async () => 1);
const safeGet = vi.fn(async () => undefined);

vi.mock('./sketch-store.service', () => ({
  isDeleted,
  isProcessed,
  markProcessed,
  markDeleted,
}));

vi.mock('./heavy-hitter.service', () => ({
  incrementDomain,
  incrementBrand,
  incrementSimPrefix,
  addToHeavyHitters,
}));

vi.mock('./baseline.service', () => ({
  updateGlobalBaseline,
}));

vi.mock('./candidate-gate.service', () => ({
  isCandidate,
}));

vi.mock('./config.service', () => ({
  getConfig,
}));

vi.mock('./dossier.service', () => ({
  processEventForClusters,
  redactEvidenceFromDossiers,
}));

vi.mock('./internal-content.service', () => ({
  isCampaignLensDashboardPost: () => false,
}));

vi.mock('../devvit/redis-client', () => ({
  safeDel: vi.fn(async () => true),
  safeExpire,
  safeGet,
  safeIncrBy: vi.fn(async () => 1),
  safeSet,
  safeZAdd,
  safeZCard,
  safeZRem: vi.fn(async () => true),
  safeZRemRangeByRank: vi.fn(async () => true),
}));

const { ingestPost } = await import('./content-ingestion.service');

describe('content ingestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isCandidate.mockReturnValue({ isCandidate: true, reasons: ['test'] });
    safeSet.mockResolvedValue(true);
    safeZAdd.mockResolvedValue(true);
  });

  it('does not mark candidate content processed when evidence storage fails', async () => {
    safeSet.mockResolvedValueOnce(false);

    await ingestPost({
      post: {
        id: 't3_post',
        title: 'Check campaign.example',
        selftext: 'campaign.example is useful',
      },
    });

    expect(processEventForClusters).not.toHaveBeenCalled();
    expect(markProcessed).not.toHaveBeenCalled();
  });

  it('marks non-candidate content processed', async () => {
    isCandidate.mockReturnValue({ isCandidate: false, reasons: [] });

    await ingestPost({
      post: {
        id: 't3_post',
        title: 'ordinary discussion',
        selftext: 'nothing coordinated here',
      },
    });

    expect(markProcessed).toHaveBeenCalledWith('t3_post');
  });
});
