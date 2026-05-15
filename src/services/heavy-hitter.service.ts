import { heavyHitterKey, domainCounterKey, brandCounterKey, simCounterKey } from './redis-keys.service';
import { TTL } from './ttl.service';
import { safeIncrBy, safeExpire, safeZIncrBy } from '../devvit/redis-client';

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

export async function addToHeavyHitters(window: string, signalKey: string, score: number): Promise<void> {
  const key = heavyHitterKey(window);
  const newScore = await safeZIncrBy(key, signalKey, score);
  if (newScore !== undefined) await safeExpire(key, TTL.BLOOM_VERSION);
}
