import { realtime } from '@devvit/web/server';
import type {
  EvidenceDossier,
  EvidenceSample,
  DossierSummary,
  DossierExample,
  DossierTimelineItem,
  DossierStatus,
  CampaignShapeScore,
} from '../types/dossier';
import type { CampaignLensConfig, BaselineMode } from '../types/config';
import { calculateCampaignScore, generateExplanationBullets, isHighConfidence } from './scoring.service';
import { getConfig } from './config.service';
import { getBaselineMode, getBaselineZScore } from './baseline.service';
import { hourBucket, dossierKey, DOSSIERS_ACTIVE_KEY, evidenceSignalIndexKey, reportCounterKey } from './redis-keys.service';
import { TTL } from './ttl.service';
import { safeGet, safeSet, safeExpire, safeZAdd, safeZRange, safeZRem } from './redis-safe.service';
import { isAllowlistedSignal, isWatchedSignal } from './signal-list.service';
import { getEffectiveCaps } from './memory-pressure.service';

const DOSSIER_UPDATES_CHANNEL = 'dossier_updates';

function toExamples(samples: EvidenceSample[], max: number): DossierExample[] {
  return samples.slice(0, max).map((s) => ({
    contentId: s.contentId,
    excerpt: s.shortExcerpt,
    matchedFragments: s.matchedFragments,
    flags: s.flags,
    threadId: s.threadId,
    createdAt: s.createdAt,
  }));
}

function toTimeline(samples: EvidenceSample[]): DossierTimelineItem[] {
  const items: DossierTimelineItem[] = [];
  for (const s of samples) {
    items.push({ timestamp: s.createdAt, label: `${s.kind} detected`, kind: 'mention' });
    for (const flag of s.flags) {
      items.push({ timestamp: s.createdAt, label: flag, kind: 'obfuscation' });
    }
  }
  return items.sort((a, b) => a.timestamp - b.timestamp);
}

function computeSketchAggregates(samples: EvidenceSample[], localBaselineZScore: number): Record<string, number> {
  const domainMentions = samples.reduce(
    (acc, s) => acc + s.signalKeys.filter((k) => k.startsWith('domain:')).length,
    0
  );
  const brandMentions = samples.reduce(
    (acc, s) => acc + s.signalKeys.filter((k) => k.startsWith('brand:')).length,
    0
  );

  const timestamps = samples.map((s) => s.createdAt);
  const timeSpanMinutes =
    timestamps.length >= 2
      ? (Math.max(...timestamps) - Math.min(...timestamps)) / 60_000
      : 0;

  return {
    domainMentions,
    brandMentions,
    timeSpanMinutes,
    localBaselineZScore,
  };
}

async function loadClusterEvidence(
  signalKey: string,
  windowMs: number,
  now: number
): Promise<EvidenceSample[]> {
  const cutoff = now - windowMs;
  const bucket = hourBucket(now);
  const indexKey = evidenceSignalIndexKey(signalKey, bucket);
  const prevBucket = hourBucket(now - 3600_000);
  const prevIndexKey = evidenceSignalIndexKey(signalKey, prevBucket);

  const [currentEntries, prevEntries] = await Promise.all([
    safeZRange(indexKey, 0, -1),
    safeZRange(prevIndexKey, 0, -1),
  ]);

  const allEntries = [...currentEntries, ...prevEntries];
  const samples: EvidenceSample[] = [];

  for (const entry of allEntries) {
    const memberId = entry.member;
    const json = await safeGet(`cl:evidence:${memberId}`);
    if (!json) continue;
    try {
      const sample: EvidenceSample = JSON.parse(json);
      if (sample.createdAt >= cutoff) {
        samples.push(sample);
      }
    } catch {
      continue;
    }
  }

  return samples;
}

export async function processEventForClusters(evidence: EvidenceSample): Promise<void> {
  const now = Date.now();
  const config = await getConfig();
  const windowMs = config.windowMinutes * 60 * 1000;
  const baselineMode = await getBaselineMode();

  for (const signalKey of evidence.signalKeys) {
    if (isAllowlistedSignal(signalKey, config)) continue;

    const clusterSamples = await loadClusterEvidence(signalKey, windowMs, now);
    const sampleById = new Map(clusterSamples.map((sample) => [sample.id, sample]));
    sampleById.set(evidence.id, evidence);
    const allSamples = [...sampleById.values()].sort((a, b) => b.createdAt - a.createdAt);

    if (allSamples.length < 2) continue;

    const localBaselineZScore = await getBaselineZScore(hourBucket(now), allSamples.length);
    const aggregates = computeSketchAggregates(allSamples, localBaselineZScore);
    const reportCount = await aggregateReportCount(signalKey, now, windowMs);
    const score = calculateCampaignScore(allSamples, aggregates, reportCount, config);

    const threshold = isWatchedSignal(signalKey, config)
      ? Math.max(20, config.threshold - 15)
      : config.threshold;

    if (score.total >= threshold) {
      await upsertDossier(signalKey, allSamples, score, config, baselineMode);
    }
  }
}

export async function upsertDossier(
  clusterKey: string,
  samples: EvidenceSample[],
  score: CampaignShapeScore,
  config: CampaignLensConfig,
  baselineMode: BaselineMode = 'COLD_START'
): Promise<EvidenceDossier> {
  const existingId = await findDossierByClusterKey(clusterKey);
  const now = Date.now();

  const examples = toExamples(samples, config.maxExamplesPerDossier);
  const timeline = toTimeline(samples);
  const explanationBullets = generateExplanationBullets(score, samples, clusterKey);
  if (isWatchedSignal(clusterKey, config)) {
    explanationBullets.push('Watchlist match: this signal is configured for closer review');
  }
  const status = determineDossierStatus(clusterKey, score, config, baselineMode);

  let dossier: EvidenceDossier;

  if (existingId) {
    const existingJson = await safeGet(dossierKey(existingId));
    if (existingJson) {
      try {
        const existing: EvidenceDossier = JSON.parse(existingJson);
        dossier = {
          ...existing,
          score,
          examples,
          timeline,
          explanationBullets,
          status,
          updatedAt: now,
        };
      } catch {
        dossier = buildNewDossier(clusterKey, score, status, examples, timeline, explanationBullets, now);
      }
    } else {
      dossier = buildNewDossier(clusterKey, score, status, examples, timeline, explanationBullets, now);
    }
  } else {
    dossier = buildNewDossier(clusterKey, score, status, examples, timeline, explanationBullets, now);
  }

  const wrote = await safeSet(dossierKey(dossier.id), JSON.stringify(dossier));
  if (wrote) await safeExpire(dossierKey(dossier.id), getEffectiveCaps(config).dossierTTLDays * 24 * 3600);

  await safeZAdd(DOSSIERS_ACTIVE_KEY, { member: dossier.id, score: dossier.score.total });
  try {
    await realtime.send(DOSSIER_UPDATES_CHANNEL, { dossierId: dossier.id, action: 'updated' });
  } catch (error) {
    console.warn('CampaignLens realtime dossier update failed', { dossierId: dossier.id, error });
  }

  return dossier;
}

function buildNewDossier(
  clusterKey: string,
  score: CampaignShapeScore,
  status: DossierStatus,
  examples: DossierExample[],
  timeline: DossierTimelineItem[],
  explanationBullets: string[],
  now: number
): EvidenceDossier {
  const id = `dossier-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    clusterKey,
    status,
    score,
    signalKey: clusterKey,
    examples,
    timeline,
    explanationBullets,
    createdAt: now,
    updatedAt: now,
  };
}

async function findDossierByClusterKey(clusterKey: string): Promise<string | null> {
  // Scan active dossiers to find one with matching clusterKey
  const ids = await safeZRange(DOSSIERS_ACTIVE_KEY, 0, -1);
  for (const entry of ids) {
    const id = entry.member;
    const json = await safeGet(dossierKey(id));
    if (!json) continue;
    try {
      const dossier: EvidenceDossier = JSON.parse(json);
      if (dossier.clusterKey === clusterKey) return id;
    } catch {
      continue;
    }
  }
  return null;
}

export async function listActiveDossiers(): Promise<DossierSummary[]> {
  const entries = await safeZRange(DOSSIERS_ACTIVE_KEY, 0, -1, { reverse: true, by: 'rank' });
  const summaries: DossierSummary[] = [];

  for (const entry of entries) {
    const id = entry.member;
    const json = await safeGet(dossierKey(id));
    if (!json) continue;
    try {
      const dossier: EvidenceDossier = JSON.parse(json);
      summaries.push({
        id: dossier.id,
        clusterKey: dossier.clusterKey,
        status: dossier.status,
        totalScore: dossier.score.total,
        signalKey: dossier.signalKey,
        exampleCount: dossier.examples.length,
        createdAt: dossier.createdAt,
        updatedAt: dossier.updatedAt,
      });
    } catch {
      continue;
    }
  }

  return summaries;
}

export async function getDossier(id: string): Promise<EvidenceDossier | null> {
  const json = await safeGet(dossierKey(id));
  if (!json) return null;
  try {
    return JSON.parse(json) as EvidenceDossier;
  } catch {
    return null;
  }
}

const TERMINAL_STATUSES: DossierStatus[] = ['IGNORED', 'BENIGN', 'CONFIRMED', 'ESCALATED'];

export async function updateDossierStatus(
  id: string,
  status: DossierStatus
): Promise<EvidenceDossier | null> {
  const json = await safeGet(dossierKey(id));
  if (!json) return null;

  let dossier: EvidenceDossier;
  try {
    dossier = JSON.parse(json);
  } catch {
    return null;
  }

  dossier.status = status;
  dossier.updatedAt = Date.now();

  const wrote = await safeSet(dossierKey(id), JSON.stringify(dossier));
  if (wrote) await safeExpire(dossierKey(id), TTL.DOSSIER_DAYS);

  if (TERMINAL_STATUSES.includes(status)) {
    await safeZRem(DOSSIERS_ACTIVE_KEY, [id]);
  }

  try {
    await realtime.send(DOSSIER_UPDATES_CHANNEL, { dossierId: id, action: 'updated' });
  } catch (error) {
    console.warn('CampaignLens realtime dossier status update failed', { dossierId: id, error });
  }

  return dossier;
}

export async function redactEvidenceFromDossiers(contentId: string): Promise<void> {
  const entries = await safeZRange(DOSSIERS_ACTIVE_KEY, 0, -1);

  for (const entry of entries) {
    const id = entry.member;
    const json = await safeGet(dossierKey(id));
    if (!json) continue;

    try {
      const dossier = JSON.parse(json) as EvidenceDossier;
      const examples = dossier.examples.filter((example) => example.contentId !== contentId);
      if (examples.length === dossier.examples.length) continue;

      const updated: EvidenceDossier = {
        ...dossier,
        examples,
        updatedAt: Date.now(),
      };

      const wrote = await safeSet(dossierKey(id), JSON.stringify(updated));
      if (wrote) await safeExpire(dossierKey(id), TTL.DOSSIER_DAYS);
      await safeZAdd(DOSSIERS_ACTIVE_KEY, { member: id, score: updated.score.total });

      try {
        await realtime.send(DOSSIER_UPDATES_CHANNEL, { dossierId: id, action: 'updated' });
      } catch (error) {
        console.warn('CampaignLens realtime redaction update failed', { dossierId: id, error });
      }
    } catch {
      continue;
    }
  }
}

async function aggregateReportCount(signalKey: string, now: number, windowMs: number): Promise<number> {
  const buckets = new Set<string>();
  for (let ts = now; ts >= now - windowMs; ts -= 3600_000) {
    buckets.add(hourBucket(ts));
  }

  let total = 0;
  for (const bucket of buckets) {
    const value = await safeGet(reportCounterKey(signalKey, bucket));
    const count = value ? Number.parseInt(value, 10) : 0;
    if (Number.isFinite(count)) total += count;
  }
  return total;
}

function determineDossierStatus(
  clusterKey: string,
  score: CampaignShapeScore,
  config: CampaignLensConfig,
  baselineMode: BaselineMode
): DossierStatus {
  const allowlisted = isAllowlistedSignal(clusterKey, config);
  if (isHighConfidence(score, config, baselineMode, allowlisted, false)) {
    return 'HIGH_CONFIDENCE';
  }

  if (
    score.total >= config.highConfidenceThreshold ||
    (isWatchedSignal(clusterKey, config) && score.total >= config.threshold) ||
    score.independentSignalFamilies >= Math.max(2, config.requiredSignalFamilies - 1)
  ) {
    return 'NEEDS_REVIEW';
  }

  return 'WATCH';
}
