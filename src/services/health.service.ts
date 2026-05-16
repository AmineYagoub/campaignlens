import type { HealthCheck, HealthReport, HealthState } from '../types/health';
import { ACTION_HISTORY_KEY, DOSSIERS_ACTIVE_KEY } from './redis-keys.service';
import { getConfig } from './config.service';
import { getBaselineMode } from './baseline.service';
import { getEffectiveCaps, isUnderMemoryPressure, refreshMemoryPressure } from './memory-pressure.service';
import { safeExpire, safeGet, safeSet, safeZCard } from '../devvit/redis-client';

const HEALTH_PROBE_KEY = 'cl:health:probe';
const APP_VERSION = '1.0.0';

export async function getHealthReport(subredditName?: string): Promise<HealthReport> {
  const checkedAt = Date.now();
  const config = await getConfig();
  const redis = await checkRedis(checkedAt);
  const baselineMode = await getBaselineMode();
  const memoryPressure = refreshMemoryPressure(config);
  const effectiveCaps = getEffectiveCaps(config);

  const checks = {
    redis,
    config: checkConfig(config),
    baseline: checkBaseline(baselineMode),
    memory: checkMemory(),
  };

  const status: HealthState = Object.values(checks).some((check) => check.status === 'degraded')
    ? 'degraded'
    : 'healthy';

  return {
    status,
    checkedAt,
    version: APP_VERSION,
    ...(subredditName ? { subredditName } : {}),
    checks,
    metrics: {
      activeDossiers: await safeZCard(DOSSIERS_ACTIVE_KEY),
      actionHistoryRecords: await safeZCard(ACTION_HISTORY_KEY),
      baselineMode,
      memoryPressure,
      effectiveCaps,
      config: {
        threshold: config.threshold,
        highConfidenceThreshold: config.highConfidenceThreshold,
        requiredSignalFamilies: config.requiredSignalFamilies,
        windowMinutes: config.windowMinutes,
      },
    },
  };
}

async function checkRedis(checkedAt: number): Promise<HealthCheck> {
  const probe = `ok:${checkedAt}`;
  const wrote = await safeSet(HEALTH_PROBE_KEY, probe);
  if (!wrote) {
    return { status: 'degraded', message: 'Redis write probe failed.' };
  }

  await safeExpire(HEALTH_PROBE_KEY, 300);
  const read = await safeGet(HEALTH_PROBE_KEY);
  if (read !== probe) {
    return { status: 'degraded', message: 'Redis read probe did not match the written value.' };
  }

  return { status: 'healthy' };
}

function checkConfig(config: Awaited<ReturnType<typeof getConfig>>): HealthCheck {
  if (config.threshold <= 0 || config.threshold > 100) {
    return { status: 'degraded', message: 'Campaign threshold is outside the expected range.' };
  }

  if (config.highConfidenceThreshold < config.threshold) {
    return {
      status: 'degraded',
      message: 'High-confidence threshold is lower than the campaign threshold.',
    };
  }

  return { status: 'healthy' };
}

function checkBaseline(baselineMode: HealthReport['metrics']['baselineMode']): HealthCheck {
  if (baselineMode === 'COLD_START') {
    return { status: 'degraded', message: 'Baseline is still cold; high-confidence claims stay gated.' };
  }

  return { status: 'healthy' };
}

function checkMemory(): HealthCheck {
  if (isUnderMemoryPressure()) {
    return { status: 'degraded', message: 'Memory pressure caps are active.' };
  }

  return { status: 'healthy' };
}
