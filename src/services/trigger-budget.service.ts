import { AsyncLocalStorage } from 'node:async_hooks';

type RedisOperationRecord = {
  operation: string;
  key: string;
  ok: boolean;
};

type TriggerBudgetContext = {
  label: string;
  startedAt: number;
  redisCommands: RedisOperationRecord[];
};

type TriggerBudgetSummary = {
  label: string;
  durationMs: number;
  redisCommandCount: number;
  redisFailureCount: number;
  overCommandBudget: boolean;
  overTimeBudget: boolean;
  operations: Record<string, number>;
};

const DEFAULT_COMMAND_BUDGET = 80;
const DEFAULT_TIME_BUDGET_MS = 8_000;
const store = new AsyncLocalStorage<TriggerBudgetContext>();

export async function runWithTriggerBudget<T>(
  label: string,
  action: () => Promise<T>
): Promise<T> {
  return store.run(
    {
      label,
      startedAt: Date.now(),
      redisCommands: [],
    },
    async () => {
      try {
        return await action();
      } finally {
        logBudgetSummary(getTriggerBudgetSummary());
      }
    }
  );
}

export function recordRedisCommand(operation: string, key: string, ok: boolean): void {
  const context = store.getStore();
  if (!context) return;

  context.redisCommands.push({ operation, key, ok });
}

function getTriggerBudgetSummary(): TriggerBudgetSummary | null {
  const context = store.getStore();
  if (!context) return null;

  const operations: Record<string, number> = {};
  for (const command of context.redisCommands) {
    operations[command.operation] = (operations[command.operation] ?? 0) + 1;
  }

  const durationMs = Date.now() - context.startedAt;
  const redisFailureCount = context.redisCommands.filter((command) => !command.ok).length;

  return {
    label: context.label,
    durationMs,
    redisCommandCount: context.redisCommands.length,
    redisFailureCount,
    overCommandBudget: context.redisCommands.length > DEFAULT_COMMAND_BUDGET,
    overTimeBudget: durationMs > DEFAULT_TIME_BUDGET_MS,
    operations,
  };
}

function logBudgetSummary(summary: TriggerBudgetSummary | null): void {
  if (!summary) return;

  const level = summary.overCommandBudget || summary.overTimeBudget || summary.redisFailureCount > 0
    ? 'warn'
    : 'log';

  console[level]('CampaignLens trigger budget summary', summary);
}
