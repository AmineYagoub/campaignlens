import type { CampaignLensConfig } from '../types/config';
import { DEFAULT_CONFIG } from '../types/config';
import { CONFIG_KEY } from './redis-keys.service';
import { TTL } from './ttl.service';
import { safeGet, safeSet, safeExpire } from './redis-safe.service';

export async function getConfig(): Promise<CampaignLensConfig> {
  const json = await safeGet(CONFIG_KEY);
  if (!json) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(json) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config: CampaignLensConfig): Promise<CampaignLensConfig> {
  const wrote = await safeSet(CONFIG_KEY, JSON.stringify(config));
  if (wrote) await safeExpire(CONFIG_KEY, TTL.CONFIG_DAYS);
  return config;
}
