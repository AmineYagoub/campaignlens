import type { EvidenceSample } from '../types/dossier';
import type { InteractionSketch } from '../types/sketch';
import { generateEventId } from '../utils/hashing';
import { extractSignals } from './signal-extraction.service';
import { simhash64, simhashPrefixes } from './simhash.service';
import { isProcessed, markProcessed, markDeleted, isDeleted } from './sketch-store.service';
import { incrementDomain, incrementBrand, incrementSimPrefix, addToHeavyHitters } from './heavy-hitter.service';
import { updateGlobalBaseline } from './baseline.service';
import { isCandidate } from './candidate-gate.service';
import { getEffectiveCaps, refreshMemoryPressure } from './memory-pressure.service';
import { getConfig } from './config.service';
import { filterAllowlistedSignals } from './signal-list.service';
import {
  hourBucket,
  evidenceKey,
  evidenceContentKey,
  evidenceContentSignalIndexKey,
  evidenceSignalIndexKey,
  reportCounterKey,
} from './redis-keys.service';
import { TTL } from './ttl.service';
import { processEventForClusters, redactEvidenceFromDossiers } from './dossier.service';
import {
  safeDel,
  safeExpire,
  safeGet,
  safeIncrBy,
  safeSet,
  safeZAdd,
  safeZCard,
  safeZRem,
  safeZRemRangeByRank,
} from './redis-safe.service';

export async function ingestPost(trigger: {
  post?: { id?: string; title?: string; selftext?: string; subredditId?: string };
}): Promise<void> {
  if (!trigger.post?.id) return;
  if (await isDeleted(trigger.post.id)) return;
  if (await isProcessed(trigger.post.id)) return;

  const text = `${trigger.post.title ?? ''} ${trigger.post.selftext ?? ''}`;
  const signals = extractSignals(text, text);
  const config = await getConfig();
  const hash = simhash64(text);
  const prefixes = simhashPrefixes(hash);
  const bucket = hourBucket(Date.now());

  const sketch: InteractionSketch = {
    contentId: trigger.post.id,
    ts: Date.now(),
    kind: 'post',
    hourBucket: bucket,
    hasDomain: signals.domainSignals.length > 0,
    hasBrand: signals.brandKeys.length > 0,
    hasObfuscation: signals.obfuscationFlags.length > 0,
    simhash64: hash.toString(16),
  };

  await updateGlobalBaseline(bucket, 1);

  for (const domain of signals.domainSignals) {
    await incrementDomain(domain.normalized, bucket);
    await addToHeavyHitters(bucket, `domain:${domain.normalized}`, 1);
  }
  for (const brand of signals.brandKeys) {
    await incrementBrand(brand, bucket);
    await addToHeavyHitters(bucket, `brand:${brand}`, 1);
  }
  for (const prefix of prefixes) {
    await incrementSimPrefix(prefix, bucket);
  }

  const signalKeys = [
    ...signals.domainSignals.map((d) => `domain:${d.normalized}`),
    ...signals.brandKeys.map((b) => `brand:${b}`),
  ];
  const filteredSignalKeys = filterAllowlistedSignals(signalKeys, config);

  const gate = isCandidate(sketch);
  if (gate.isCandidate) {
    if (filteredSignalKeys.length === 0) {
      await markProcessed(trigger.post.id);
      return;
    }

    refreshMemoryPressure(config);
    const caps = getEffectiveCaps(config);
    const eventId = generateEventId();
    const evidence: EvidenceSample = {
      id: eventId,
      contentId: trigger.post.id,
      kind: 'post',
      createdAt: Date.now(),
      threadId: trigger.post.id,
      signalKeys: filteredSignalKeys,
      shortExcerpt: signals.shortExcerpt,
      matchedFragments: [
        ...signals.domainSignals.map((d) => d.normalized),
        ...signals.brandKeys,
      ],
      simhash64: hash.toString(16),
      flags: signals.obfuscationFlags,
    };

    const stored = await storeEvidenceSample(evidence, caps);
    if (stored) {
      await processEventForClusters(evidence);
    } else {
      console.warn('CampaignLens event dropped before dossier processing: evidence storage failed', {
        contentId: evidence.contentId,
        evidenceId: evidence.id,
      });
    }
  }

  await markProcessed(trigger.post.id);
}

export async function ingestComment(trigger: {
  comment?: { id?: string; body?: string; postId?: string; subredditId?: string };
}): Promise<void> {
  if (!trigger.comment?.id) return;
  if (await isDeleted(trigger.comment.id)) return;
  if (await isProcessed(trigger.comment.id)) return;

  const text = trigger.comment.body ?? '';
  const signals = extractSignals(text, text);
  const config = await getConfig();
  const hash = simhash64(text);
  const prefixes = simhashPrefixes(hash);
  const bucket = hourBucket(Date.now());

  const sketch: InteractionSketch = {
    contentId: trigger.comment.id,
    ts: Date.now(),
    kind: 'comment',
    hourBucket: bucket,
    hasDomain: signals.domainSignals.length > 0,
    hasBrand: signals.brandKeys.length > 0,
    hasObfuscation: signals.obfuscationFlags.length > 0,
    simhash64: hash.toString(16),
  };

  await updateGlobalBaseline(bucket, 1);

  for (const domain of signals.domainSignals) {
    await incrementDomain(domain.normalized, bucket);
    await addToHeavyHitters(bucket, `domain:${domain.normalized}`, 1);
  }
  for (const brand of signals.brandKeys) {
    await incrementBrand(brand, bucket);
    await addToHeavyHitters(bucket, `brand:${brand}`, 1);
  }
  for (const prefix of prefixes) {
    await incrementSimPrefix(prefix, bucket);
  }

  const signalKeys = [
    ...signals.domainSignals.map((d) => `domain:${d.normalized}`),
    ...signals.brandKeys.map((b) => `brand:${b}`),
  ];
  const filteredSignalKeys = filterAllowlistedSignals(signalKeys, config);

  const gate = isCandidate(sketch);
  if (gate.isCandidate) {
    if (filteredSignalKeys.length === 0) {
      await markProcessed(trigger.comment.id);
      return;
    }

    refreshMemoryPressure(config);
    const caps = getEffectiveCaps(config);
    const eventId = generateEventId();
    const evidence: EvidenceSample = {
      id: eventId,
      contentId: trigger.comment.id,
      kind: 'comment',
      createdAt: Date.now(),
      threadId: trigger.comment.postId ?? '',
      signalKeys: filteredSignalKeys,
      shortExcerpt: signals.shortExcerpt,
      matchedFragments: [
        ...signals.domainSignals.map((d) => d.normalized),
        ...signals.brandKeys,
      ],
      simhash64: hash.toString(16),
      flags: signals.obfuscationFlags,
    };

    const stored = await storeEvidenceSample(evidence, caps);
    if (stored) {
      await processEventForClusters(evidence);
    } else {
      console.warn('CampaignLens event dropped before dossier processing: evidence storage failed', {
        contentId: evidence.contentId,
        evidenceId: evidence.id,
      });
    }
  }

  await markProcessed(trigger.comment.id);
}

export async function ingestReport(_kind: 'post' | 'comment', targetId: string, reason: string): Promise<void> {
  const evidence = await getEvidenceForContent(targetId);
  if (!evidence) return;

  const bucket = hourBucket(Date.now());

  for (const signalKey of evidence.signalKeys) {
    const key = reportCounterKey(signalKey, bucket);
    const count = await safeIncrBy(key, 1);
    if (count !== undefined) await safeExpire(key, TTL.EVIDENCE_DAYS);

    if (reason) {
      const reasonKey = `${key}:reason:${normalizeReportReason(reason)}`;
      const reasonCount = await safeIncrBy(reasonKey, 1);
      if (reasonCount !== undefined) await safeExpire(reasonKey, TTL.EVIDENCE_DAYS);
    }
  }

  await processEventForClusters(evidence);
}

export async function handlePostDelete(postId: string): Promise<void> {
  await markDeleted(postId);
  await removeEvidenceForContent(postId);
}

export async function handleCommentDelete(commentId: string): Promise<void> {
  await markDeleted(commentId);
  await removeEvidenceForContent(commentId);
}

export async function getEvidenceForContent(contentIdOrEvidenceId: string): Promise<EvidenceSample | null> {
  const indexedEvidenceId = await safeGet(evidenceContentKey(contentIdOrEvidenceId));
  const evidenceId = indexedEvidenceId ?? contentIdOrEvidenceId;
  const evidenceJson = await safeGet(evidenceKey(evidenceId));
  if (!evidenceJson) return null;

  try {
    return JSON.parse(evidenceJson) as EvidenceSample;
  } catch {
    console.warn('CampaignLens evidence JSON was invalid', { evidenceId });
    return null;
  }
}

async function removeEvidenceForContent(contentIdOrEvidenceId: string): Promise<void> {
  const evidence = await getEvidenceForContent(contentIdOrEvidenceId);
  const evidenceId = evidence?.id ?? contentIdOrEvidenceId;
  const contentId = evidence?.contentId ?? contentIdOrEvidenceId;
  const indexJson = await safeGet(evidenceContentSignalIndexKey(contentId));

  if (indexJson) {
    try {
      const signalIndexKeys = JSON.parse(indexJson) as string[];
      for (const indexKey of signalIndexKeys) {
        await safeZRem(indexKey, [evidenceId]);
      }
    } catch {
      console.warn('CampaignLens evidence index JSON was invalid during delete', {
        contentId,
        evidenceId,
      });
    }
  }

  await safeDel(evidenceKey(evidenceId));
  await safeDel(evidenceContentKey(contentId));
  await safeDel(evidenceContentSignalIndexKey(contentId));
  await redactEvidenceFromDossiers(contentId);
}

async function storeEvidenceSample(
  evidence: EvidenceSample,
  caps: { evidenceCapPerSignal: number; evidenceTTLDays: number }
): Promise<boolean> {
  const ttlSeconds = caps.evidenceTTLDays * 24 * 3600;
  const key = evidenceKey(evidence.id);
  const wroteEvidence = await safeSet(key, JSON.stringify(evidence));
  if (!wroteEvidence) return false;
  await safeExpire(key, ttlSeconds);

  const wroteContentIndex = await safeSet(evidenceContentKey(evidence.contentId), evidence.id);
  if (!wroteContentIndex) return false;
  await safeExpire(evidenceContentKey(evidence.contentId), ttlSeconds);

  const indexKeys: string[] = [];

  for (const signalKey of evidence.signalKeys) {
    const indexKey = evidenceSignalIndexKey(signalKey, hourBucket(evidence.createdAt));
    indexKeys.push(indexKey);
    const indexed = await safeZAdd(indexKey, { member: evidence.id, score: evidence.createdAt });
    if (!indexed) continue;
    await safeExpire(indexKey, ttlSeconds);

    const card = await safeZCard(indexKey);
    if (card > caps.evidenceCapPerSignal) {
      await safeZRemRangeByRank(indexKey, 0, card - caps.evidenceCapPerSignal - 1);
    }
  }

  const wroteSignalIndex = await safeSet(
    evidenceContentSignalIndexKey(evidence.contentId),
    JSON.stringify([...new Set(indexKeys)])
  );
  if (wroteSignalIndex) await safeExpire(evidenceContentSignalIndexKey(evidence.contentId), ttlSeconds);

  return true;
}

function normalizeReportReason(reason: string): string {
  return reason.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 80) || 'unspecified';
}
