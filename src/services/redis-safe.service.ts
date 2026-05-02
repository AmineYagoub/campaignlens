import { redis } from '@devvit/web/server';
import { recordRedisCommand } from './trigger-budget.service';

export type ZEntry = { member: string; score: number };

export type RedisOperation =
  | 'get'
  | 'set'
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
  | 'zRemRangeByScore'
  | 'del';

function errorMeta(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    };
  }
  return { error };
}

function logRedisFailure(operation: RedisOperation, key: string, error: unknown): void {
  console.warn('CampaignLens Redis operation failed', {
    operation,
    key,
    ...errorMeta(error),
  });
}

export async function safeGet(key: string): Promise<string | undefined> {
  try {
    const value = await redis.get(key);
    recordRedisCommand('get', key, true);
    return value;
  } catch (error) {
    recordRedisCommand('get', key, false);
    logRedisFailure('get', key, error);
    return undefined;
  }
}

export async function safeSet(key: string, value: string): Promise<boolean> {
  try {
    await redis.set(key, value);
    recordRedisCommand('set', key, true);
    return true;
  } catch (error) {
    recordRedisCommand('set', key, false);
    logRedisFailure('set', key, error);
    return false;
  }
}

export async function safeHGet(key: string, field: string): Promise<string | undefined> {
  try {
    const value = await redis.hGet(key, field);
    recordRedisCommand('hGet', key, true);
    return value;
  } catch (error) {
    recordRedisCommand('hGet', key, false);
    logRedisFailure('hGet', key, error);
    return undefined;
  }
}

export async function safeHSet(key: string, values: Record<string, string>): Promise<boolean> {
  try {
    await redis.hSet(key, values);
    recordRedisCommand('hSet', key, true);
    return true;
  } catch (error) {
    recordRedisCommand('hSet', key, false);
    logRedisFailure('hSet', key, error);
    return false;
  }
}

export async function safeHGetAll(key: string): Promise<Record<string, string>> {
  try {
    const value = await redis.hGetAll(key);
    recordRedisCommand('hGetAll', key, true);
    return value;
  } catch (error) {
    recordRedisCommand('hGetAll', key, false);
    logRedisFailure('hGetAll', key, error);
    return {};
  }
}

export async function safeHDel(key: string, fields: string[]): Promise<boolean> {
  try {
    await redis.hDel(key, fields);
    recordRedisCommand('hDel', key, true);
    return true;
  } catch (error) {
    recordRedisCommand('hDel', key, false);
    logRedisFailure('hDel', key, error);
    return false;
  }
}

export async function safeIncrBy(key: string, value: number): Promise<number | undefined> {
  try {
    const newValue = await redis.incrBy(key, value);
    recordRedisCommand('incrBy', key, true);
    return newValue;
  } catch (error) {
    recordRedisCommand('incrBy', key, false);
    logRedisFailure('incrBy', key, error);
    return undefined;
  }
}

export async function safeExpire(key: string, seconds: number): Promise<boolean> {
  try {
    await redis.expire(key, seconds);
    recordRedisCommand('expire', key, true);
    return true;
  } catch (error) {
    recordRedisCommand('expire', key, false);
    logRedisFailure('expire', key, error);
    return false;
  }
}

export async function safeZAdd(key: string, entry: ZEntry): Promise<boolean> {
  try {
    await redis.zAdd(key, entry);
    recordRedisCommand('zAdd', key, true);
    return true;
  } catch (error) {
    recordRedisCommand('zAdd', key, false);
    logRedisFailure('zAdd', key, error);
    return false;
  }
}

export async function safeZRange(
  key: string,
  start: number,
  stop: number,
  options?: Parameters<typeof redis.zRange>[3]
): Promise<ZEntry[]> {
  try {
    const entries = await redis.zRange(key, start, stop, options);
    recordRedisCommand('zRange', key, true);
    return entries;
  } catch (error) {
    recordRedisCommand('zRange', key, false);
    logRedisFailure('zRange', key, error);
    return [];
  }
}

export async function safeZCard(key: string): Promise<number> {
  try {
    const count = await redis.zCard(key);
    recordRedisCommand('zCard', key, true);
    return count;
  } catch (error) {
    recordRedisCommand('zCard', key, false);
    logRedisFailure('zCard', key, error);
    return 0;
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
    recordRedisCommand('zIncrBy', key, false);
    logRedisFailure('zIncrBy', key, error);
    return undefined;
  }
}

export async function safeZRem(key: string, members: string[]): Promise<boolean> {
  try {
    await redis.zRem(key, members);
    recordRedisCommand('zRem', key, true);
    return true;
  } catch (error) {
    recordRedisCommand('zRem', key, false);
    logRedisFailure('zRem', key, error);
    return false;
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
    recordRedisCommand('zRemRangeByRank', key, false);
    logRedisFailure('zRemRangeByRank', key, error);
    return false;
  }
}

export async function safeZRemRangeByScore(
  key: string,
  min: number,
  max: number
): Promise<boolean> {
  try {
    await redis.zRemRangeByScore(key, min, max);
    recordRedisCommand('zRemRangeByScore', key, true);
    return true;
  } catch (error) {
    recordRedisCommand('zRemRangeByScore', key, false);
    logRedisFailure('zRemRangeByScore', key, error);
    return false;
  }
}

export async function safeDel(key: string): Promise<boolean> {
  try {
    await redis.del(key);
    recordRedisCommand('del', key, true);
    return true;
  } catch (error) {
    recordRedisCommand('del', key, false);
    logRedisFailure('del', key, error);
    return false;
  }
}
