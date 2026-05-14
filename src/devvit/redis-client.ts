import { redis } from '@devvit/web/server';
import { recordRedisCommand } from '../services/trigger-budget.service';
import { errorMeta } from './errors';

type ZEntry = { member: string; score: number };
type ZRangeOptions = Parameters<typeof redis.zRange>[3];

type RedisOperation =
  | 'get'
  | 'set'
  | 'setNX'
  | 'hGet'
  | 'hSet'
  | 'hGetAll'
  | 'hDel'
  | 'incrBy'
  | 'expire'
  | 'zAdd'
  | 'zRange'
  | 'zCard'
  | 'zIncrBy'
  | 'zRem'
  | 'zRemRangeByRank'
  | 'del';

function logRedisFailure(operation: RedisOperation, key: string, error: unknown): void {
  console.warn('CampaignLens Redis operation failed', {
    operation,
    key,
    ...errorMeta(error),
  });
}

function recordRedisFailure<T>(operation: RedisOperation, key: string, error: unknown, value: T): T {
  recordRedisCommand(operation, key, false);
  logRedisFailure(operation, key, error);
  return value;
}

export async function safeGet(key: string): Promise<string | undefined> {
  try {
    const value = await redis.get(key);
    recordRedisCommand('get', key, true);
    return value;
  } catch (error) {
    return recordRedisFailure('get', key, error, undefined);
  }
}

export async function safeSet(key: string, value: string): Promise<boolean> {
  try {
    await redis.set(key, value);
    recordRedisCommand('set', key, true);
    return true;
  } catch (error) {
    return recordRedisFailure('set', key, error, false);
  }
}

export async function safeSetNX(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  try {
    const result = await redis.set(key, value, {
      nx: true,
      expiration: new Date(Date.now() + ttlSeconds * 1000),
    });
    recordRedisCommand('setNX', key, true);
    return Boolean(result);
  } catch (error) {
    return recordRedisFailure('setNX', key, error, false);
  }
}

export async function safeHGet(key: string, field: string): Promise<string | undefined> {
  try {
    const value = await redis.hGet(key, field);
    recordRedisCommand('hGet', key, true);
    return value;
  } catch (error) {
    return recordRedisFailure('hGet', key, error, undefined);
  }
}

export async function safeHSet(key: string, values: Record<string, string>): Promise<boolean> {
  try {
    await redis.hSet(key, values);
    recordRedisCommand('hSet', key, true);
    return true;
  } catch (error) {
    return recordRedisFailure('hSet', key, error, false);
  }
}

export async function safeHGetAll(key: string): Promise<Record<string, string>> {
  try {
    const value = await redis.hGetAll(key);
    recordRedisCommand('hGetAll', key, true);
    return value;
  } catch (error) {
    return recordRedisFailure('hGetAll', key, error, {});
  }
}

export async function safeHDel(key: string, fields: string[]): Promise<boolean> {
  try {
    await redis.hDel(key, fields);
    recordRedisCommand('hDel', key, true);
    return true;
  } catch (error) {
    return recordRedisFailure('hDel', key, error, false);
  }
}

export async function safeIncrBy(key: string, value: number): Promise<number | undefined> {
  try {
    const newValue = await redis.incrBy(key, value);
    recordRedisCommand('incrBy', key, true);
    return newValue;
  } catch (error) {
    return recordRedisFailure('incrBy', key, error, undefined);
  }
}

export async function safeExpire(key: string, seconds: number): Promise<boolean> {
  try {
    await redis.expire(key, seconds);
    recordRedisCommand('expire', key, true);
    return true;
  } catch (error) {
    return recordRedisFailure('expire', key, error, false);
  }
}

export async function safeZAdd(key: string, entry: ZEntry): Promise<boolean> {
  try {
    await redis.zAdd(key, entry);
    recordRedisCommand('zAdd', key, true);
    return true;
  } catch (error) {
    return recordRedisFailure('zAdd', key, error, false);
  }
}

export async function safeZRange(
  key: string,
  start: number,
  stop: number,
  options?: ZRangeOptions
): Promise<ZEntry[]> {
  try {
    const entries = await redis.zRange(key, start, stop, options);
    recordRedisCommand('zRange', key, true);
    return entries;
  } catch (error) {
    return recordRedisFailure('zRange', key, error, []);
  }
}

export async function safeZCard(key: string): Promise<number> {
  try {
    const count = await redis.zCard(key);
    recordRedisCommand('zCard', key, true);
    return count;
  } catch (error) {
    return recordRedisFailure('zCard', key, error, 0);
  }
}

export async function safeZIncrBy(
  key: string,
  member: string,
  value: number
): Promise<number | undefined> {
  try {
    const newValue = await redis.zIncrBy(key, member, value);
    recordRedisCommand('zIncrBy', key, true);
    return newValue;
  } catch (error) {
    return recordRedisFailure('zIncrBy', key, error, undefined);
  }
}

export async function safeZRem(key: string, members: string[]): Promise<boolean> {
  try {
    await redis.zRem(key, members);
    recordRedisCommand('zRem', key, true);
    return true;
  } catch (error) {
    return recordRedisFailure('zRem', key, error, false);
  }
}

export async function safeZRemRangeByRank(
  key: string,
  start: number,
  stop: number
): Promise<boolean> {
  try {
    await redis.zRemRangeByRank(key, start, stop);
    recordRedisCommand('zRemRangeByRank', key, true);
    return true;
  } catch (error) {
    return recordRedisFailure('zRemRangeByRank', key, error, false);
  }
}

export async function safeDel(key: string): Promise<boolean> {
  try {
    await redis.del(key);
    recordRedisCommand('del', key, true);
    return true;
  } catch (error) {
    return recordRedisFailure('del', key, error, false);
  }
}
