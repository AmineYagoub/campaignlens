import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../types/config';

let redisWritable = true;
const redisStore = new Map<string, string>();
const safeSet = vi.fn(async (key: string, value: string) => {
  if (!redisWritable) return false;
  redisStore.set(key, value);
  return true;
});
const safeGet = vi.fn(async (key: string) => redisStore.get(key));
const safeExpire = vi.fn(async () => true);
const safeZCard = vi.fn(async () => 0);
const getConfig = vi.fn(async () => DEFAULT_CONFIG);
const getBaselineMode = vi.fn(async () => 'LEARNING');
const refreshMemoryPressure = vi.fn(() => false);
const getEffectiveCaps = vi.fn(() => ({
  evidenceCap: DEFAULT_CONFIG.evidenceCap,
  evidenceCapPerSignal: DEFAULT_CONFIG.evidenceCapPerSignal,
  maxExamplesPerDossier: DEFAULT_CONFIG.maxExamplesPerDossier,
  evidenceTTLDays: 7,
  dossierTTLDays: 30,
}));
const isUnderMemoryPressure = vi.fn(() => false);

vi.mock('../devvit/redis-client', () => ({
  safeSet,
  safeGet,
  safeExpire,
  safeZCard,
}));

vi.mock('./config.service', () => ({
  getConfig,
}));

vi.mock('./baseline.service', () => ({
  getBaselineMode,
}));

vi.mock('./memory-pressure.service', () => ({
  refreshMemoryPressure,
  getEffectiveCaps,
  isUnderMemoryPressure,
}));

const { getHealthReport } = await import('./health.service');

describe('health service', () => {
  beforeEach(() => {
    redisWritable = true;
    redisStore.clear();
    vi.clearAllMocks();
  });

  it('returns a privacy-safe healthy diagnostics report', async () => {
    const report = await getHealthReport('campaignlens_dev');

    expect(report.status).toBe('healthy');
    expect(report.subredditName).toBe('campaignlens_dev');
    expect(report.checks.redis.status).toBe('healthy');
    expect(JSON.stringify(report)).not.toMatch(/author|username|excerpt|content/i);
  });

  it('marks Redis as degraded when the probe cannot write', async () => {
    redisWritable = false;

    const report = await getHealthReport();

    expect(report.status).toBe('degraded');
    expect(report.checks.redis.status).toBe('degraded');
  });

  it('marks cold baseline as degraded without blocking diagnostics', async () => {
    getBaselineMode.mockResolvedValueOnce('COLD_START');

    const report = await getHealthReport();

    expect(report.status).toBe('degraded');
    expect(report.checks.baseline.message).toContain('Baseline is still cold');
  });
});
