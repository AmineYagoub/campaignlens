import { heavyHitterKey, domainCounterKey, brandCounterKey, simCounterKey } from './redis-keys.service';
import { TTL } from './ttl.service';
import { safeIncrBy, safeExpire, safeZIncrBy, safeZRange, safeZRemRangeByScore } from './redis-safe.service';

export async function incrementDomain(domain: string, hourBucket: string): Promise<void> {
  const key = domainCounterKey(domain, hourBucket);
  const incremented = await safeIncrBy(key, 1);
  if (incremented !== undefined) await safeExpire(key, TTL.BLOOM_VERSION);
}

export async function incrementBrand(brand: string, hourBucket: string): Promise<void> {
  const key = brandCounterKey(brand, hourBucket);
  const incremented = await safeIncrBy(key, 1);
  if (incremented !== undefined) await safeExpire(key, TTL.BLOOM_VERSION);
}

export async function incrementSimPrefix(prefix: string, hourBucket: string): Promise<void> {
  const key = simCounterKey(prefix, hourBucket);
  const incremented = await safeIncrBy(key, 1);
  if (incremented !== undefined) await safeExpire(key, TTL.BLOOM_VERSION);
}

export async function getTopKeys(window: string, limit: number): Promise<Array<{ key: string; count: number }>> {
  const key = heavyHitterKey(window);
  const results = await safeZRange(key, 0, limit - 1, { by: 'score', reverse: true });
  return results.map((r) => ({ key: r.member, count: r.score }));
}

export async function addToHeavyHitters(window: string, signalKey: string, score: number): Promise<void> {
  const key = heavyHitterKey(window);
  const newScore = await safeZIncrBy(key, signalKey, score);
  if (newScore !== undefined) await safeExpire(key, TTL.BLOOM_VERSION);
}

export async function decayCounters(window: string): Promise<void> {
  // Remove items with score <= 1 from heavy hitters
  const key = heavyHitterKey(window);
  await safeZRemRangeByScore(key, 0, 1);
}
