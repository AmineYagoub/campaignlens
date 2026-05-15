import { Hono } from 'hono';
import { DOSSIERS_ACTIVE_KEY, PRECISION_KEY } from '../services/redis-keys.service';
import { safeGet, safeZCard } from '../devvit/redis-client';
import type { PrecisionStats } from '../types/feedback';

export const apiStats = new Hono().basePath('/api/stats');

apiStats.get('/', async (c) => {
  const precisionJson = await safeGet(PRECISION_KEY);
  const precision = parsePrecisionStats(precisionJson);

  return c.json({
    activeDossiers: await safeZCard(DOSSIERS_ACTIVE_KEY),
    reviewedHighConfidence: precision.reviewedHighConfidence,
    markedFalsePositive: precision.markedFalsePositive,
    markedBenign: precision.markedBenign,
    confirmedCampaign: precision.confirmedCampaign,
  });
});

function parsePrecisionStats(json: string | undefined): PrecisionStats {
  if (!json) {
    return {
      reviewedHighConfidence: 0,
      markedFalsePositive: 0,
      markedBenign: 0,
      confirmedCampaign: 0,
    };
  }

  try {
    return JSON.parse(json) as PrecisionStats;
  } catch {
    return {
      reviewedHighConfidence: 0,
      markedFalsePositive: 0,
      markedBenign: 0,
      confirmedCampaign: 0,
    };
  }
}
