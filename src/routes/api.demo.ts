import { Hono } from 'hono';
import type { EvidenceSample } from '../types/dossier';
import { DEFAULT_CONFIG } from '../types/config';
import { calculateCampaignScore } from '../services/scoring.service';
import { upsertDossier } from '../services/dossier.service';
import { DEMO_SEEDED_KEY, DOSSIERS_ACTIVE_KEY, dossierKey } from '../services/redis-keys.service';
import { safeDel, safeGet, safeSet, safeZRem } from '../services/redis-safe.service';

export const apiDemo = new Hono().basePath('/api/demo');
const DEMO_SIGNAL_KEY = 'domain:demo-campaign.example';

apiDemo.post('/seed', async (c) => {
  const existingId = await safeGet(DEMO_SEEDED_KEY);
  if (existingId) {
    return c.json({ seeded: true, dossierId: existingId, reused: true });
  }

  const now = Date.now();
  const samples = buildDemoSamples(now);
  const score = calculateCampaignScore(
    samples,
    {
      domainMentions: 8,
      brandMentions: 5,
      timeSpanMinutes: 32,
      localBaselineZScore: 0,
    },
    1,
    DEFAULT_CONFIG
  );

  const dossier = await upsertDossier(DEMO_SIGNAL_KEY, samples, score, DEFAULT_CONFIG, 'LEARNING');
  await safeSet(DEMO_SEEDED_KEY, dossier.id);

  return c.json({ seeded: true, dossierId: dossier.id, reused: false });
});

apiDemo.post('/reset', async (c) => {
  const dossierId = await safeGet(DEMO_SEEDED_KEY);
  if (dossierId) {
    await safeDel(dossierKey(dossierId));
    await safeZRem(DOSSIERS_ACTIVE_KEY, [dossierId]);
  }
  await safeDel(DEMO_SEEDED_KEY);

  return c.json({ reset: true, dossierId: dossierId ?? null });
});

function buildDemoSamples(now: number): EvidenceSample[] {
  return Array.from({ length: 6 }, (_, i) => ({
    id: `demo-evidence-${i + 1}`,
    contentId: `t1_demo_${i + 1}`,
    kind: i % 2 === 0 ? 'post' : 'comment',
    createdAt: now - (5 - i) * 6 * 60_000,
    threadId: `t3_demo_thread_${(i % 3) + 1}`,
    signalKeys: [DEMO_SIGNAL_KEY, 'brand:demo-lens'],
    shortExcerpt: 'Several new accounts repeat demo-campaign.example with similar wording.',
    matchedFragments: ['demo-campaign.example', 'demo lens'],
    simhash64: i < 3 ? 'aaaaaaaaaaaaaaaa' : 'aaaaaaaabaaaaaaa',
    flags: i === 0 ? ['DOT_WORD'] : [],
  }));
}
