import { Hono } from 'hono';
import { getHealthReport } from '../services/health.service';
import { getDevvitContext } from '../devvit/context';

export const apiHealth = new Hono().basePath('/api/health');

apiHealth.get('/', async (c) => {
  const context = getDevvitContext();
  return c.json(await getHealthReport(context?.subredditName));
});
