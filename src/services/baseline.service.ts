import { BASELINE_KEY } from './redis-keys.service';
import { TTL } from './ttl.service';
import type { BaselineMode } from '../types/config';
import { safeHGet, safeHGetAll, safeHSet, safeExpire } from './redis-safe.service';

interface BaselineBucket {
  count: number;
  updatedAt: number;
}

export async function updateGlobalBaseline(hourBucket: string, interactionCount: number): Promise<void> {
  const field = `h:${hourBucket}`;
  const existing = await safeHGet(BASELINE_KEY, field);
  const prev: BaselineBucket = existing ? parseBaselineBucket(existing) : { count: 0, updatedAt: Date.now() };
  prev.count += interactionCount;
  prev.updatedAt = Date.now();
  const wrote = await safeHSet(BASELINE_KEY, { [field]: JSON.stringify(prev) });
  if (wrote) await safeExpire(BASELINE_KEY, TTL.BASELINE_DAYS);
}

export async function getBaselineZScore(hourBucket: string, observedCount: number): Promise<number> {
  // Gather historical counts for this hour across available days
  const all = await safeHGetAll(BASELINE_KEY);
  const counts: number[] = [];

  for (const [field, value] of Object.entries(all)) {
    if (!field.startsWith('h:')) continue;
    // Extract hour part (YYYY-MM-DDTHH) — compare same hour across days
    const parts = field.slice(2).split('T');
    if (parts.length < 2) continue;
    const hour = parts[1];
    const currentHour = hourBucket.split('T')[1];
    if (hour === currentHour) {
      const bucket = parseBaselineBucket(value);
      counts.push(bucket.count);
    }
  }

  if (counts.length < 3) return 0;

  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const variance = counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length;
  const stddev = Math.sqrt(variance);

  if (stddev === 0) return observedCount > mean ? 10 : 0;
  return (observedCount - mean) / stddev;
}

export async function computeRollingBaseline(signalKey: string, _windowHours: number): Promise<{ mean: number; stddev: number }> {
  // For signal-specific baselines, use a separate hash
  const key = `${BASELINE_KEY}:sig:${signalKey}`;
  const all = await safeHGetAll(key);
  const counts: number[] = [];

  for (const [, value] of Object.entries(all)) {
    const bucket = parseBaselineBucket(value);
    counts.push(bucket.count);
  }

  if (counts.length === 0) return { mean: 0, stddev: 0 };

  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const variance = counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length;
  return { mean, stddev: Math.sqrt(variance) };
}

export async function getBaselineMode(): Promise<BaselineMode> {
  const all = await safeHGetAll(BASELINE_KEY);
  const hourEntries = Object.keys(all).filter((k) => k.startsWith('h:'));

  if (hourEntries.length === 0) return 'COLD_START';

  // Find the most recent and oldest timestamps
  let oldest = Infinity;
  let newest = 0;
  for (const [, value] of Object.entries(all)) {
    const bucket = parseBaselineBucket(value);
    oldest = Math.min(oldest, bucket.updatedAt);
    newest = Math.max(newest, bucket.updatedAt);
  }

  const ageMs = newest - oldest;
  const oneDayMs = 24 * 3600 * 1000;

  if (ageMs < oneDayMs) return 'COLD_START';
  if (ageMs < 7 * oneDayMs) return 'LEARNING';
  return 'CALIBRATED';
}

function parseBaselineBucket(value: string): BaselineBucket {
  try {
    const parsed = JSON.parse(value) as Partial<BaselineBucket>;
    return {
      count: typeof parsed.count === 'number' ? parsed.count : 0,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return { count: 0, updatedAt: Date.now() };
  }
}
