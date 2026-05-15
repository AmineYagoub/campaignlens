import { Hono } from 'hono';
import { getConfig, saveConfig } from '../services/config.service';
import type { CampaignLensConfig } from '../types/config';
import { readJsonBody } from './request';

export const apiConfig = new Hono().basePath('/api/config');

apiConfig.get('/', async (c) => {
  const config = await getConfig();
  return c.json(config);
});

apiConfig.post('/', async (c) => {
  const body = await readJsonBody<Partial<CampaignLensConfig>>(c);
  if (body instanceof Response) return body;

  const current = await getConfig();

  // Merge only known configuration fields.
  const updated: CampaignLensConfig = {
    threshold: numberOrCurrent(body.threshold, current.threshold),
    highConfidenceThreshold: numberOrCurrent(body.highConfidenceThreshold, current.highConfidenceThreshold),
    requiredSignalFamilies: numberOrCurrent(body.requiredSignalFamilies, current.requiredSignalFamilies),
    weights: {
      domainBurst: numberOrCurrent(body.weights?.domainBurst, current.weights.domainBurst),
      brandBurst: numberOrCurrent(body.weights?.brandBurst, current.weights.brandBurst),
      threadSpread: numberOrCurrent(body.weights?.threadSpread, current.weights.threadSpread),
      simhash: numberOrCurrent(body.weights?.simhash, current.weights.simhash),
      participationPattern: numberOrCurrent(
        body.weights?.participationPattern,
        current.weights.participationPattern
      ),
      obfuscation: numberOrCurrent(body.weights?.obfuscation, current.weights.obfuscation),
      report: numberOrCurrent(body.weights?.report, current.weights.report),
    },
    allowlist: stringArrayOrCurrent(body.allowlist, current.allowlist),
    blocklist: stringArrayOrCurrent(body.blocklist, current.blocklist),
    harmfulNarrativeWatchlist: stringArrayOrCurrent(
      body.harmfulNarrativeWatchlist,
      current.harmfulNarrativeWatchlist
    ),
    windowMinutes: numberOrCurrent(body.windowMinutes, current.windowMinutes),
    evidenceCap: numberOrCurrent(body.evidenceCap, current.evidenceCap),
    evidenceCapPerSignal: numberOrCurrent(body.evidenceCapPerSignal, current.evidenceCapPerSignal),
    maxExamplesPerDossier: numberOrCurrent(body.maxExamplesPerDossier, current.maxExamplesPerDossier),
  };

  const saved = await saveConfig(updated);
  return c.json(saved);
});

function numberOrCurrent(value: unknown, current: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : current;
}

function stringArrayOrCurrent(value: unknown, current: string[]): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : current;
}
