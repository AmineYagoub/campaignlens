import type {
  EvidenceDossier,
  EvidenceSample,
  DossierSummary,
  DossierExample,
  DossierTimelineItem,
  DossierStatus,
  CampaignShapeScore,
  CampaignCategory,
} from '../types/dossier';
import type { CampaignLensConfig, BaselineMode } from '../types/config';
import { calculateCampaignScore, generateExplanationBullets, isHighConfidence } from './scoring.service';
import { getConfig } from './config.service';
import { getBaselineMode, getBaselineZScore } from './baseline.service';
import { hourBucket, dossierKey, DOSSIERS_ACTIVE_KEY, evidenceSignalIndexKey, reportCounterKey } from './redis-keys.service';
import { TTL } from './ttl.service';
import { safeGet, safeSet, safeExpire, safeZAdd, safeZRange, safeZRem } from '../devvit/redis-client';
import { sendRealtime } from '../devvit/realtime-client';
import { DOSSIER_UPDATES_CHANNEL } from '../devvit/realtime-channels';
import { isAllowlistedSignal, isWatchedSignal } from './signal-list.service';
import { getEffectiveCaps } from './memory-pressure.service';
import { isCampaignLensInternalDossier } from './internal-content.service';

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
  const timeSpan = timestampSpan(timestamps);
  const timeSpanMinutes = timeSpan ? (timeSpan.max - timeSpan.min) / 60_000 : 0;

  return {
    domainMentions,
    brandMentions,
    timeSpanMinutes,
    localBaselineZScore,
  };
}

function timestampSpan(timestamps: number[]): { min: number; max: number } | null {
  if (timestamps.length < 2) return null;

  let min = timestamps[0]!;
  let max = timestamps[0]!;
  for (const timestamp of timestamps.slice(1)) {
    if (timestamp < min) min = timestamp;
    if (timestamp > max) max = timestamp;
  }
  return { min, max };
}

export function clusterKeysForEvidence(evidence: EvidenceSample): string[] {
  const domainKeys = preferSpecificDomainKeys(
    evidence.signalKeys.filter((key) => key.startsWith('domain:'))
  );
  if (domainKeys.length > 0) return domainKeys;
  return [...new Set(evidence.signalKeys.filter((key) => key.startsWith('brand:')))];
}

function preferSpecificDomainKeys(keys: string[]): string[] {
  const unique = [...new Set(keys)];
  return unique.filter((candidate) => {
    const candidateValue = candidate.slice('domain:'.length);
    return !unique.some((other) => {
      if (candidate === other) return false;
      const otherValue = other.slice('domain:'.length);
      return otherValue.endsWith(candidateValue)
        && otherValue.at(-(candidateValue.length + 1)) === '-';
    });
  });
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

  for (const signalKey of clusterKeysForEvidence(evidence)) {
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
  const category = categorizeCampaign(clusterKey, samples, config);
  const explanationBullets = generateExplanationBullets(score, samples, clusterKey);
  if (category === 'POSSIBLE_HARMFUL_NARRATIVE') {
    explanationBullets.push('Category: possible harmful narrative matched moderator-configured watch terms');
  }
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
          category,
          examples,
          timeline,
          explanationBullets,
          status,
          updatedAt: now,
        };
      } catch {
        dossier = buildNewDossier(clusterKey, score, category, status, examples, timeline, explanationBullets, now);
      }
    } else {
      dossier = buildNewDossier(clusterKey, score, category, status, examples, timeline, explanationBullets, now);
    }
  } else {
    dossier = buildNewDossier(clusterKey, score, category, status, examples, timeline, explanationBullets, now);
  }

  const wrote = await safeSet(dossierKey(dossier.id), JSON.stringify(dossier));
  if (!wrote) throw new Error('Failed to persist dossier.');
  await safeExpire(dossierKey(dossier.id), getEffectiveCaps(config).dossierTTLDays * 24 * 3600);

  const indexed = await safeZAdd(DOSSIERS_ACTIVE_KEY, { member: dossier.id, score: dossier.score.total });
  if (!indexed) throw new Error('Failed to index active dossier.');
  try {
    await sendRealtime(DOSSIER_UPDATES_CHANNEL, { dossierId: dossier.id, action: 'updated' });
  } catch (error) {
    console.warn('CampaignLens realtime dossier update failed', { dossierId: dossier.id, error });
  }

  return dossier;
}

function buildNewDossier(
  clusterKey: string,
  score: CampaignShapeScore,
  category: CampaignCategory,
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
    category,
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

export function categorizeCampaign(
  clusterKey: string,
  samples: EvidenceSample[],
  config: CampaignLensConfig
): CampaignCategory {
  if (matchesHarmfulNarrativeWatchlist(clusterKey, samples, config.harmfulNarrativeWatchlist)) {
    return 'POSSIBLE_HARMFUL_NARRATIVE';
  }

  if (
    clusterKey.startsWith('domain:') ||
    samples.some((sample) => sample.signalKeys.some((key) => key.startsWith('domain:')))
  ) {
    return 'COMMERCIAL_PROMOTION';
  }

  return 'UNKNOWN';
}

function matchesHarmfulNarrativeWatchlist(
  clusterKey: string,
  samples: EvidenceSample[],
  terms: string[]
): boolean {
  const normalizedTerms = terms.map(normalizeWatchTerm).filter(Boolean);
  if (normalizedTerms.length === 0) return false;

  const searchable = [
    clusterKey,
    ...samples.flatMap((sample) => [
      sample.shortExcerpt,
      ...sample.signalKeys,
      ...sample.matchedFragments,
      ...sample.flags,
    ]),
  ]
    .join(' ')
    .toLowerCase();

  return normalizedTerms.some((term) => searchable.includes(term));
}

function normalizeWatchTerm(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, ' ');
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
  const dossiers: EvidenceDossier[] = [];

  for (const entry of entries) {
    const id = entry.member;
    const json = await safeGet(dossierKey(id));
    if (!json) continue;
    try {
      const dossier: EvidenceDossier = JSON.parse(json);
      if (isCampaignLensInternalDossier(dossier)) {
        await safeZRem(DOSSIERS_ACTIVE_KEY, [id]);
        continue;
      }
      dossiers.push(dossier);
    } catch {
      continue;
    }
  }

  const deduped = dedupeOverlappingDossiers(dossiers);
  const removedIds = dossiers
    .filter((dossier) => !deduped.some((kept) => kept.id === dossier.id))
    .map((dossier) => dossier.id);
  if (removedIds.length > 0) await safeZRem(DOSSIERS_ACTIVE_KEY, removedIds);

  return deduped.map((dossier) => ({
    id: dossier.id,
    clusterKey: dossier.clusterKey,
    category: dossier.category ?? 'UNKNOWN',
    status: dossier.status,
    totalScore: dossier.score.total,
    signalKey: dossier.signalKey,
    exampleCount: dossier.examples.length,
    createdAt: dossier.createdAt,
    updatedAt: dossier.updatedAt,
  }));
}

function dedupeOverlappingDossiers(dossiers: EvidenceDossier[]): EvidenceDossier[] {
  const byEvidenceSet = new Map<string, EvidenceDossier>();

  for (const dossier of dossiers) {
    const evidenceSignature = dossier.examples
      .map((example) => example.contentId)
      .sort()
      .join('|');
    const key = evidenceSignature || dossier.id;
    const existing = byEvidenceSet.get(key);

    if (!existing || dossierRank(dossier) > dossierRank(existing)) {
      byEvidenceSet.set(key, dossier);
    }
  }

  return [...byEvidenceSet.values()].sort((a, b) => b.score.total - a.score.total || b.updatedAt - a.updatedAt);
}

function dossierRank(dossier: EvidenceDossier): number {
  const value = dossier.signalKey.includes(':')
    ? dossier.signalKey.split(':').slice(1).join(':')
    : dossier.signalKey;
  const kindScore = dossier.signalKey.startsWith('domain:') ? 10_000 : 0;
  const specificityScore = value.includes('.') ? 1_000 : 0;
  return kindScore + specificityScore + value.length;
}

export async function getDossier(id: string): Promise<EvidenceDossier | null> {
  const json = await safeGet(dossierKey(id));
  if (!json) return null;
  try {
    const dossier = JSON.parse(json) as EvidenceDossier;
    if (isCampaignLensInternalDossier(dossier)) {
      await safeZRem(DOSSIERS_ACTIVE_KEY, [id]);
      return null;
    }
    dossier.category = dossier.category ?? inferStoredDossierCategory(dossier.clusterKey);
    return dossier;
  } catch {
    return null;
  }
}

function inferStoredDossierCategory(clusterKey: string): CampaignCategory {
  if (clusterKey.startsWith('domain:')) return 'COMMERCIAL_PROMOTION';
  return 'UNKNOWN';
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
  if (!wrote) throw new Error('Failed to persist dossier status.');
  await safeExpire(dossierKey(id), TTL.DOSSIER_DAYS);

  if (TERMINAL_STATUSES.includes(status)) {
    await safeZRem(DOSSIERS_ACTIVE_KEY, [id]);
  }

  try {
    await sendRealtime(DOSSIER_UPDATES_CHANNEL, { dossierId: id, action: 'updated' });
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
      if (!wrote) throw new Error('Failed to persist redacted dossier.');
      await safeExpire(dossierKey(id), TTL.DOSSIER_DAYS);
      const indexed = await safeZAdd(DOSSIERS_ACTIVE_KEY, { member: id, score: updated.score.total });
      if (!indexed) throw new Error('Failed to reindex redacted dossier.');

      try {
        await sendRealtime(DOSSIER_UPDATES_CHANNEL, { dossierId: id, action: 'updated' });
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
