import { describe, expect, it } from 'vitest';
import {
  getTriggerBudgetSummary,
  recordRedisCommand,
  runWithTriggerBudget,
} from './trigger-budget.service';

describe('trigger-budget service', () => {
  it('collects redis command counts inside a trigger context', async () => {
    let summary = null;

    await runWithTriggerBudget('test-trigger', async () => {
      recordRedisCommand('get', 'cl:test:1', true);
      recordRedisCommand('set', 'cl:test:2', false);
      summary = getTriggerBudgetSummary();
    });

    expect(summary).toMatchObject({
      label: 'test-trigger',
      redisCommandCount: 2,
      redisFailureCount: 1,
      overCommandBudget: false,
      overTimeBudget: false,
      operations: {
        get: 1,
        set: 1,
      },
    });
  });

  it('does not expose a budget context outside a trigger run', () => {
    expect(getTriggerBudgetSummary()).toBeNull();
  });
});
