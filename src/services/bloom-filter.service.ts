import { redis } from '@devvit/web/server';
import { bloomHash } from '../utils/hashing';
import type { BloomFilterConfig } from '../types/sketch';

const configs = new Map<string, BloomFilterConfig>();

function computeBloomParams(capacity: number, fpRate: number): { bitCount: number; hashCount: number } {
  const ln2 = Math.log(2);
  const bitCount = Math.ceil(-(capacity * Math.log(fpRate)) / (ln2 * ln2));
  const hashCount = Math.ceil((bitCount / capacity) * ln2);
  return { bitCount: Math.max(bitCount, 64), hashCount: Math.max(hashCount, 1) };
}

export async function bfCreate(key: string, capacity: number, fpRate: number): Promise<BloomFilterConfig> {
  const { bitCount, hashCount } = computeBloomParams(capacity, fpRate);
  const config: BloomFilterConfig = { capacity, fpRate, bitCount, hashCount };
  configs.set(key, config);
  return config;
}

export async function bfAdd(key: string, item: string): Promise<void> {
  const config = configs.get(key) ?? await bfCreate(key, 100_000, 0.001);

  for (let i = 0; i < config.hashCount; i++) {
    const hash = bloomHash(item, i);
    const bit = hash % config.bitCount;
    await redis.bitfield(key, 'set', 'u1', bit, 1);
  }
}

export async function bfHas(key: string, item: string): Promise<boolean> {
  const config = configs.get(key);
  if (!config) return false;

  for (let i = 0; i < config.hashCount; i++) {
    const hash = bloomHash(item, i);
    const bit = hash % config.bitCount;
    const results = await redis.bitfield(key, 'get', 'u1', bit);
    if ((results[0] ?? 0) === 0) return false;
  }

  return true;
}
