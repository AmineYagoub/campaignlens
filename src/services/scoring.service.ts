import type { CampaignShapeScore, EvidenceSample } from '../types/dossier';
import type { BaselineMode, CampaignLensConfig } from '../types/config';
import { hammingDistance64 } from './simhash.service';

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function domainBurstScore(mentions: number): number {
  if (mentions >= 12) return 100;
  if (mentions >= 8) return 75;
  if (mentions >= 5) return 50;
  if (mentions >= 3) return 25;
  return 0;
}

function brandBurstScore(mentions: number): number {
  if (mentions >= 10) return 100;
  if (mentions >= 5) return 50;
  return 0;
}

function threadSpreadScore(threadCount: number): number {
  if (threadCount >= 5) return 100;
  if (threadCount >= 3) return 70;
  if (threadCount >= 2) return 40;
  return 0;
}

function simhashScore(pairs: number): number {
  if (pairs >= 6) return 100;
  if (pairs >= 4) return 70;
  if (pairs >= 2) return 40;
  return 0;
}

function participationPatternScore(
  threadCount: number,
  timeSpanMinutes: number,
  contentVariety: number,
  sampleCount: number
): number {
  if (sampleCount === 0) return 0;

  let score = 0;

  if (threadCount >= 5) score += 40;
  else if (threadCount >= 3) score += 25;
  else if (threadCount >= 2) score += 10;

  if (timeSpanMinutes > 0 && timeSpanMinutes <= 30) score += 40;
  else if (timeSpanMinutes > 0 && timeSpanMinutes <= 60) score += 25;
  else if (timeSpanMinutes > 0 && timeSpanMinutes <= 120) score += 10;

  if (contentVariety >= 0 && contentVariety <= 3) score += 20;
  else if (contentVariety >= 4 && contentVariety <= 6) score += 10;

  return clamp(score);
}

function obfuscationScore(flaggedCount: number): number {
  if (flaggedCount >= 3) return 100;
  if (flaggedCount >= 2) return 70;
  if (flaggedCount >= 1) return 40;
  return 0;
}

function reportScore(count: number): number {
  if (count >= 5) return 100;
  if (count >= 3) return 70;
  if (count >= 1) return 40;
  return 0;
}

function countNearDuplicatePairs(samples: EvidenceSample[]): number {
  const hashes = samples
    .filter((s) => s.simhash64)
    .map((s) => BigInt('0x' + s.simhash64!));

  let pairs = 0;
  for (let i = 0; i < hashes.length; i++) {
    for (let j = i + 1; j < hashes.length; j++) {
      if (hammingDistance64(hashes[i]!, hashes[j]!) <= 10) {
        pairs++;
      }
    }
  }
  return pairs;
}

function countDistinctThreads(samples: EvidenceSample[]): number {
  return new Set(samples.map((s) => s.threadId)).size;
}

function countObfuscated(samples: EvidenceSample[]): number {
  return samples.filter((s) => s.flags.length > 0).length;
}

function computeContentVariety(samples: EvidenceSample[]): number {
  const excerpts = new Set(samples.map((s) => s.shortExcerpt));
  return excerpts.size;
}

export function calculateCampaignScore(
  evidenceSamples: EvidenceSample[],
  sketchAggregates: Record<string, number>,
  reportCount: number,
  config: CampaignLensConfig
): CampaignShapeScore {
  const domainMentions = sketchAggregates['domainMentions'] ?? 0;
  const brandMentions = sketchAggregates['brandMentions'] ?? 0;
  const timeSpanMinutes = sketchAggregates['timeSpanMinutes'] ?? 0;
  const localBaselineZScore = sketchAggregates['localBaselineZScore'] ?? 0;

  const threads = countDistinctThreads(evidenceSamples);
  const nearDupPairs = countNearDuplicatePairs(evidenceSamples);
  const obfuscatedCount = countObfuscated(evidenceSamples);
  const contentVariety = computeContentVariety(evidenceSamples);

  const dBS = domainBurstScore(domainMentions);
  const bBS = brandBurstScore(brandMentions);
  const tSS = threadSpreadScore(threads);
  const sS = simhashScore(nearDupPairs);
  const pPS = participationPatternScore(threads, timeSpanMinutes, contentVariety, evidenceSamples.length);
  const oS = obfuscationScore(obfuscatedCount);
  const rS = reportScore(reportCount);

  const w = config.weights;
  const total = clamp(
    dBS * w.domainBurst +
    bBS * w.brandBurst +
    tSS * w.threadSpread +
    sS * w.simhash +
    pPS * w.participationPattern +
    oS * w.obfuscation +
    rS * w.report
  );

  // Count independent signal families
  const families: boolean[] = [
    domainMentions >= 3,     // domain burst
    brandMentions >= 3,      // brand burst
    threads >= 2,            // thread spread
    timeSpanMinutes > 0 && timeSpanMinutes <= 60, // timing burst
    nearDupPairs >= 2,       // near-duplicate phrasing
    obfuscatedCount >= 1,    // obfuscation
    reportCount >= 1,        // report reinforcement
  ];
  const independentSignalFamilies = families.filter(Boolean).length;

  return {
    total,
    domainBurst: dBS,
    brandBurst: bBS,
    threadSpread: tSS,
    simhash: sS,
    participationPattern: pPS,
    obfuscation: oS,
    report: rS,
    independentSignalFamilies,
    localBaselineZScore,
  };
}

export function isHighConfidence(
  score: CampaignShapeScore,
  config: CampaignLensConfig,
  baselineMode: BaselineMode,
  isAllowlisted: boolean,
  recentlyMarkedBenign: boolean
): boolean {
  return (
    baselineMode === 'CALIBRATED' &&
    score.total >= config.highConfidenceThreshold &&
    score.independentSignalFamilies >= config.requiredSignalFamilies &&
    score.localBaselineZScore >= 4 &&
    !isAllowlisted &&
    !recentlyMarkedBenign
  );
}

export function generateExplanationBullets(
  score: CampaignShapeScore,
  evidenceSamples: EvidenceSample[],
  clusterKey: string
): string[] {
  const bullets: string[] = [];

  const signalLabel = clusterKey.includes(':')
    ? clusterKey.split(':').slice(1).join(':')
    : clusterKey;

  bullets.push(`${score.total} total score for signal "${signalLabel}"`);

  if (score.domainBurst >= 50) {
    bullets.push(`Domain burst: ${score.domainBurst}/100 — repeated domain mentions in a short window`);
  }
  if (score.brandBurst >= 50) {
    bullets.push(`Brand burst: ${score.brandBurst}/100 — repeated brand references detected`);
  }
  if (score.threadSpread >= 40) {
    bullets.push(`Thread spread: ${score.threadSpread}/100 — activity across ${countDistinctThreads(evidenceSamples)} threads`);
  }
  if (score.simhash >= 40) {
    bullets.push(`Near-duplicates: ${score.simhash}/100 — ${countNearDuplicatePairs(evidenceSamples)} similar phrase pairs`);
  }
  if (score.participationPattern >= 40) {
    bullets.push(`Participation pattern: ${score.participationPattern}/100 — concentrated timing and low content variety`);
  }
  if (score.obfuscation >= 40) {
    bullets.push(`Obfuscation: ${score.obfuscation}/100 — ${countObfuscated(evidenceSamples)} items with obfuscated links`);
  }
  if (score.report >= 40) {
    bullets.push(`Reports: ${score.report}/100 — user reports reinforce this pattern`);
  }

  if (score.independentSignalFamilies >= 3) {
    bullets.push(`${score.independentSignalFamilies} independent signal families detected`);
  }

  return bullets;
}
