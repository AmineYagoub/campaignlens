import { Hono } from 'hono';
import { getConfig, saveConfig } from '../services/config.service';
import type { CampaignLensConfig } from '../types/config';

export const apiConfig = new Hono().basePath('/api/config');

apiConfig.get('/', async (c) => {
  const config = await getConfig();
  return c.json(config);
});

apiConfig.post('/', async (c) => {
  const body = await c.req.json<Partial<CampaignLensConfig>>();
  const current = await getConfig();

  // Merge — only allowlisted fields
  const updated: CampaignLensConfig = {
    ...current,
    ...body,
    weights: {
      ...current.weights,
      ...(body.weights ?? {}),
    },
    allowlist: body.allowlist ?? current.allowlist,
    blocklist: body.blocklist ?? current.blocklist,
  };

  const saved = await saveConfig(updated);
  return c.json(saved);
});
