import { describe, expect, it } from 'vitest';
import { recordRedisCommand, runWithTriggerBudget } from './trigger-budget.service';

describe('trigger-budget service', () => {
  it('logs redis command counts inside a trigger context', async () => {
    let summary: unknown;
    const originalLog = console.log;
    console.log = (_message?: unknown, value?: unknown) => {
      summary = value;
    };

    try {
      await runWithTriggerBudget('test-trigger', async () => {
        recordRedisCommand('get', 'cl:test:1', true);
        recordRedisCommand('set', 'cl:test:2', true);
      });
    } finally {
      console.log = originalLog;
    }

    expect(summary).toMatchObject({
      label: 'test-trigger',
      redisCommandCount: 2,
      redisFailureCount: 0,
      overCommandBudget: false,
      overTimeBudget: false,
      operations: {
        get: 1,
        set: 1,
      },
    });
  });

  it('logs failed commands at warning level', async () => {
    let summary: unknown;
    const originalWarn = console.warn;
    console.warn = (_message?: unknown, value?: unknown) => {
      summary = value;
    };

    try {
      await runWithTriggerBudget('test-trigger', async () => {
        recordRedisCommand('set', 'cl:test:2', false);
      });
    } finally {
      console.warn = originalWarn;
    }

    expect(summary).toMatchObject({
      label: 'test-trigger',
      redisCommandCount: 1,
      redisFailureCount: 1,
      operations: {
        set: 1,
      },
    });
  });
});
