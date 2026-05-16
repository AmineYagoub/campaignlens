import { Hono } from 'hono';
import { getConfig, saveConfig } from '../services/config.service';
import type { CampaignLensConfig } from '../types/config';
import { readJsonBody } from './request';

export const apiConfig = new Hono().basePath('/api/config');

apiConfig.get('/', async (c) => {
  try {
    const config = await getConfig();
    return c.json(config);
  } catch {
    return c.json({ error: 'Failed to fetch configuration' }, 500);
  }
});

apiConfig.post('/', async (c) => {
  const body = await readJsonBody<Partial<CampaignLensConfig>>(c);
  if (body instanceof Response) return body;

  try {
    const current = await getConfig();

    // Merge only known configuration fields.
    const updated: CampaignLensConfig = {
      threshold: numberOrCurrent(body.threshold, current.threshold, 'threshold', 20, 90),
      highConfidenceThreshold: numberOrCurrent(
        body.highConfidenceThreshold,
        current.highConfidenceThreshold,
        'highConfidenceThreshold',
        60,
        99
      ),
      requiredSignalFamilies: integerOrCurrent(
        body.requiredSignalFamilies,
        current.requiredSignalFamilies,
        'requiredSignalFamilies',
        1,
        6
      ),
      weights: {
        domainBurst: numberOrCurrent(
          body.weights?.domainBurst,
          current.weights.domainBurst,
          'weights.domainBurst',
          0.05,
          0.4
        ),
        brandBurst: numberOrCurrent(
          body.weights?.brandBurst,
          current.weights.brandBurst,
          'weights.brandBurst',
          0.05,
          0.4
        ),
        threadSpread: numberOrCurrent(
          body.weights?.threadSpread,
          current.weights.threadSpread,
          'weights.threadSpread',
          0.05,
          0.4
        ),
        simhash: numberOrCurrent(
          body.weights?.simhash,
          current.weights.simhash,
          'weights.simhash',
          0.05,
          0.4
        ),
        participationPattern: numberOrCurrent(
          body.weights?.participationPattern,
          current.weights.participationPattern,
          'weights.participationPattern',
          0,
          0.3
        ),
        obfuscation: numberOrCurrent(
          body.weights?.obfuscation,
          current.weights.obfuscation,
          'weights.obfuscation',
          0,
          0.3
        ),
        report: numberOrCurrent(
          body.weights?.report,
          current.weights.report,
          'weights.report',
          0,
          0.3
        ),
      },
      allowlist: stringArrayOrCurrent(body.allowlist, current.allowlist, 'allowlist'),
      blocklist: stringArrayOrCurrent(body.blocklist, current.blocklist, 'blocklist'),
      harmfulNarrativeWatchlist: stringArrayOrCurrent(
        body.harmfulNarrativeWatchlist,
        current.harmfulNarrativeWatchlist,
        'harmfulNarrativeWatchlist'
      ),
      windowMinutes: integerOrCurrent(body.windowMinutes, current.windowMinutes, 'windowMinutes', 15, 240),
      evidenceCap: integerOrCurrent(body.evidenceCap, current.evidenceCap, 'evidenceCap', 1_000, 20_000),
      evidenceCapPerSignal: integerOrCurrent(
        body.evidenceCapPerSignal,
        current.evidenceCapPerSignal,
        'evidenceCapPerSignal',
        10,
        200
      ),
      maxExamplesPerDossier: integerOrCurrent(
        body.maxExamplesPerDossier,
        current.maxExamplesPerDossier,
        'maxExamplesPerDossier',
        1,
        10
      ),
    };

    if (updated.highConfidenceThreshold < updated.threshold) {
      return c.json({ error: 'highConfidenceThreshold must be greater than or equal to threshold' }, 400);
    }

    const saved = await saveConfig(updated);
    return c.json(saved);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to update configuration' }, 400);
  }
});

function numberOrCurrent(value: unknown, current: number, field: string, min: number, max: number): number {
  if (value === undefined) return current;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${field} must be a number between ${min} and ${max}`);
  }
  return value;
}

function integerOrCurrent(value: unknown, current: number, field: string, min: number, max: number): number {
  const parsed = numberOrCurrent(value, current, field, min, max);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${field} must be an integer`);
  }
  return parsed;
}

function stringArrayOrCurrent(value: unknown, current: string[], field: string): string[] {
  if (value === undefined) return current;
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`${field} must be an array of strings`);
  }
  return value;
}
