import type { Context } from 'hono';
import { runWithTriggerBudget } from '../services/trigger-budget.service';

export async function runDevvitTrigger(
  c: Context,
  label: string,
  action: () => Promise<void>
): Promise<Response> {
  try {
    await runWithTriggerBudget(label, action);
  } catch (error) {
    console.error('CampaignLens trigger failed', { label, error });
  }
  return c.json({}, 200);
}
