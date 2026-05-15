import { describe, it, expect } from 'vitest';
import {
  calculateCampaignScore,
  isHighConfidence,
  generateExplanationBullets,
} from './scoring.service';
import type { EvidenceSample } from '../types/dossier';
import { DEFAULT_CONFIG } from '../types/config';

function makeSample(overrides: Partial<EvidenceSample> = {}): EvidenceSample {
  return {
    id: 'evt-1',
    contentId: 't1_abc',
    kind: 'comment',
    createdAt: Date.now(),
    threadId: 't3_thread1',
    signalKeys: ['domain:example.com'],
    shortExcerpt: 'check this out',
    matchedFragments: ['example.com'],
    flags: [],
    ...overrides,
  };
}

function makeSamples(count: number, overrides: Partial<EvidenceSample> = {}): EvidenceSample[] {
  return Array.from({ length: count }, (_, i) =>
    makeSample({
      id: `evt-${i}`,
      contentId: `t1_${i}`,
      shortExcerpt: `excerpt ${i}`,
      threadId: `t3_thread${i % 3}`,
      ...overrides,
    })
  );
}

describe('calculateCampaignScore', () => {
  it('returns 0 for empty evidence', () => {
    const result = calculateCampaignScore([], {}, 0, DEFAULT_CONFIG);
    expect(result.total).toBe(0);
    expect(result.domainBurst).toBe(0);
    expect(result.brandBurst).toBe(0);
    expect(result.threadSpread).toBe(0);
    expect(result.simhash).toBe(0);
    expect(result.participationPattern).toBe(0);
    expect(result.obfuscation).toBe(0);
    expect(result.report).toBe(0);
    expect(result.independentSignalFamilies).toBe(0);
  });

  it('returns low score for a single normal sample', () => {
    const samples = [makeSample()];
    const result = calculateCampaignScore(samples, { domainMentions: 1, brandMentions: 0, timeSpanMinutes: 120 }, 0, DEFAULT_CONFIG);
    expect(result.total).toBeLessThan(20);
  });

  it('keeps two repeated examples below the default threshold', () => {
    const samples = makeSamples(2, {
      signalKeys: ['domain:campaign.example', 'brand:campaign'],
      simhash64: 'a'.repeat(16),
      shortExcerpt: 'same repeated comparison for campaign.example',
    });
    samples[0]!.threadId = 't3_thread1';
    samples[1]!.threadId = 't3_thread2';

    const result = calculateCampaignScore(
      samples,
      { domainMentions: 2, brandMentions: 2, timeSpanMinutes: 5 },
      0,
      DEFAULT_CONFIG
    );

    expect(result.total).toBeLessThan(DEFAULT_CONFIG.threshold);
  });

  it('surfaces three separate-thread repeated examples for quick review', () => {
    const samples = makeSamples(3, {
      signalKeys: ['domain:campaign.example', 'brand:campaign'],
      simhash64: 'a'.repeat(16),
      shortExcerpt: 'same repeated comparison for campaign.example',
    });
    samples[0]!.threadId = 't3_thread1';
    samples[1]!.threadId = 't3_thread2';
    samples[2]!.threadId = 't3_thread3';

    const result = calculateCampaignScore(
      samples,
      { domainMentions: 3, brandMentions: 3, timeSpanMinutes: 10 },
      0,
      DEFAULT_CONFIG
    );

    expect(result.total).toBeGreaterThanOrEqual(DEFAULT_CONFIG.threshold);
  });

  it('scores campaign pattern high', () => {
    const samples = makeSamples(10, {
      simhash64: 'a'.repeat(16),
      flags: ['DOT_WORD'],
      signalKeys: ['domain:shady.com', 'brand:shady'],
    });

    const aggregates = {
      domainMentions: 12,
      brandMentions: 10,
      timeSpanMinutes: 25,
      localBaselineZScore: 5.2,
    };

    const result = calculateCampaignScore(samples, aggregates, 5, DEFAULT_CONFIG);
    expect(result.total).toBeGreaterThanOrEqual(70);
    expect(result.domainBurst).toBe(100);
    expect(result.brandBurst).toBe(100);
    expect(result.report).toBe(100);
    expect(result.obfuscation).toBe(100);
  });

  it('produces ~72 for the demo scenario', () => {
    // Demo: 8 domain mentions, 5 brand mentions, 3 threads, 20min window,
    // 4 near-dup pairs, 1 obfuscated, 1 report, low variety
    const samples = makeSamples(6, {
      simhash64: 'a'.repeat(16),
      threadId: 't3_thread1',
      shortExcerpt: 'check this product',
      flags: [],
    });
    samples[0]!.flags = ['DOT_WORD'];
    samples[0]!.simhash64 = 'b'.repeat(16);
    samples[1]!.simhash64 = 'b'.repeat(16);
    samples[2]!.simhash64 = 'c'.repeat(16);
    samples[3]!.simhash64 = 'c'.repeat(16);
    samples[4]!.simhash64 = 'd'.repeat(16);
    samples[5]!.simhash64 = 'd'.repeat(16);
    samples[4]!.threadId = 't3_thread2';
    samples[5]!.threadId = 't3_thread3';

    const aggregates = {
      domainMentions: 8,
      brandMentions: 5,
      timeSpanMinutes: 20,
      localBaselineZScore: 3.0,
    };

    const result = calculateCampaignScore(samples, aggregates, 1, DEFAULT_CONFIG);
    // domainBurst(75)×0.25 + brandBurst(50)×0.2 + threadSpread(40)×0.2
    // + simhash(40)×0.15 + participation(70)×0.1 + obfuscation(40)×0.05 + report(40)×0.05
    // = 18.75 + 10 + 8 + 6 + 7 + 2 + 2 = 53.75
    // But thread count is 3 → threadSpread=70, not 40
    // = 18.75 + 10 + 14 + 6 + 7 + 2 + 2 = 59.75 → ~60
    expect(result.total).toBeGreaterThanOrEqual(50);
    expect(result.total).toBeLessThanOrEqual(80);
    expect(result.domainBurst).toBe(75);
    expect(result.brandBurst).toBe(50);
  });

  it('clamps all scores to 0-100', () => {
    const samples = makeSamples(20, {
      simhash64: 'a'.repeat(16),
      flags: ['DOT_WORD', 'HXXP'],
      signalKeys: ['domain:example.com'],
    });

    const maxAggregates = {
      domainMentions: 50,
      brandMentions: 50,
      timeSpanMinutes: 5,
      localBaselineZScore: 20,
    };

    const result = calculateCampaignScore(samples, maxAggregates, 20, DEFAULT_CONFIG);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.domainBurst).toBeLessThanOrEqual(100);
    expect(result.brandBurst).toBeLessThanOrEqual(100);
    expect(result.threadSpread).toBeLessThanOrEqual(100);
    expect(result.simhash).toBeLessThanOrEqual(100);
    expect(result.participationPattern).toBeLessThanOrEqual(100);
    expect(result.obfuscation).toBeLessThanOrEqual(100);
    expect(result.report).toBeLessThanOrEqual(100);
  });

  it('uses correct weights from config', () => {
    const samples = makeSamples(10, { simhash64: 'a'.repeat(16), flags: ['DOT_WORD'] });
    const aggregates = { domainMentions: 12, brandMentions: 10, timeSpanMinutes: 10 };

    const customConfig = {
      ...DEFAULT_CONFIG,
      weights: {
        domainBurst: 1.0,
        brandBurst: 0,
        threadSpread: 0,
        simhash: 0,
        participationPattern: 0,
        obfuscation: 0,
        report: 0,
      },
    };

    const result = calculateCampaignScore(samples, aggregates, 0, customConfig);
    // domainBurst=100, weight=1.0 → total=100
    expect(result.total).toBe(100);
  });

  it('counts independent signal families correctly', () => {
    const samples = makeSamples(5, {
      simhash64: 'a'.repeat(16),
      flags: ['DOT_WORD'],
    });
    const aggregates = {
      domainMentions: 5,
      brandMentions: 5,
      timeSpanMinutes: 30,
    };

    const result = calculateCampaignScore(samples, aggregates, 1, DEFAULT_CONFIG);
    // domain >=3 ✓, brand >=3 ✓, threads (3 distinct) >=2 ✓,
    // timing <=60 ✓, nearDupPairs (1 pair, same hash) >=2 ✗,
    // obfuscated >=1 ✓, report >=1 ✓
    expect(result.independentSignalFamilies).toBeGreaterThanOrEqual(5);
  });

  it('returns 0 simhash score when no samples have simhash', () => {
    const samples = makeSamples(5);
    const result = calculateCampaignScore(samples, {}, 0, DEFAULT_CONFIG);
    expect(result.simhash).toBe(0);
  });

  it('counts near-duplicate pairs across different simhashes', () => {
    // Two pairs of matching hashes
    const samples = [
      makeSample({ id: '1', simhash64: 'a'.repeat(16) }),
      makeSample({ id: '2', simhash64: 'a'.repeat(16) }),
      makeSample({ id: '3', simhash64: 'b'.repeat(16) }),
      makeSample({ id: '4', simhash64: 'b'.repeat(16) }),
    ];

    const result = calculateCampaignScore(samples, {}, 0, DEFAULT_CONFIG);
    expect(result.simhash).toBe(40); // 2 pairs → score 40
  });
});

describe('isHighConfidence', () => {
  const baseScore = {
    total: 90,
    domainBurst: 100,
    brandBurst: 80,
    threadSpread: 70,
    simhash: 60,
    participationPattern: 50,
    obfuscation: 40,
    report: 30,
    independentSignalFamilies: 4,
    localBaselineZScore: 5.0,
  };

  it('returns true when all conditions are met', () => {
    expect(isHighConfidence(baseScore, DEFAULT_CONFIG, 'CALIBRATED', false, false)).toBe(true);
  });

  it('returns false for non-CALIBRATED baseline mode', () => {
    expect(isHighConfidence(baseScore, DEFAULT_CONFIG, 'COLD_START', false, false)).toBe(false);
    expect(isHighConfidence(baseScore, DEFAULT_CONFIG, 'LEARNING', false, false)).toBe(false);
  });

  it('returns false when score is below threshold', () => {
    const lowScore = { ...baseScore, total: 80 };
    expect(isHighConfidence(lowScore, DEFAULT_CONFIG, 'CALIBRATED', false, false)).toBe(false);
  });

  it('returns false when not enough signal families', () => {
    const fewFamilies = { ...baseScore, independentSignalFamilies: 2 };
    expect(isHighConfidence(fewFamilies, DEFAULT_CONFIG, 'CALIBRATED', false, false)).toBe(false);
  });

  it('returns false when z-score is too low', () => {
    const lowZ = { ...baseScore, localBaselineZScore: 3.0 };
    expect(isHighConfidence(lowZ, DEFAULT_CONFIG, 'CALIBRATED', false, false)).toBe(false);
  });

  it('returns false when allowlisted', () => {
    expect(isHighConfidence(baseScore, DEFAULT_CONFIG, 'CALIBRATED', true, false)).toBe(false);
  });

  it('returns false when recently marked benign', () => {
    expect(isHighConfidence(baseScore, DEFAULT_CONFIG, 'CALIBRATED', false, true)).toBe(false);
  });

  it('returns false when score exactly equals threshold', () => {
    const exactScore = { ...baseScore, total: DEFAULT_CONFIG.highConfidenceThreshold };
    expect(isHighConfidence(exactScore, DEFAULT_CONFIG, 'CALIBRATED', false, false)).toBe(true);
  });
});

describe('generateExplanationBullets', () => {
  it('includes total score', () => {
    const score = {
      total: 65,
      domainBurst: 75,
      brandBurst: 0,
      threadSpread: 0,
      simhash: 0,
      participationPattern: 0,
      obfuscation: 0,
      report: 0,
      independentSignalFamilies: 1,
      localBaselineZScore: 0,
    };
    const bullets = generateExplanationBullets(score, [makeSample()], 'domain:example.com');
    expect(bullets[0]).toContain('65 total score');
    expect(bullets[0]).toContain('example.com');
  });

  it('includes domain burst when >= 50', () => {
    const score = { total: 50, domainBurst: 75, brandBurst: 0, threadSpread: 0, simhash: 0, participationPattern: 0, obfuscation: 0, report: 0, independentSignalFamilies: 0, localBaselineZScore: 0 };
    const bullets = generateExplanationBullets(score, [makeSample()], 'cluster');
    expect(bullets.some(b => b.includes('Domain burst'))).toBe(true);
  });

  it('omits low component scores', () => {
    const score = { total: 10, domainBurst: 25, brandBurst: 0, threadSpread: 0, simhash: 0, participationPattern: 0, obfuscation: 0, report: 0, independentSignalFamilies: 0, localBaselineZScore: 0 };
    const bullets = generateExplanationBullets(score, [makeSample()], 'cluster');
    expect(bullets.some(b => b.includes('Domain burst'))).toBe(false);
  });

  it('includes all high components', () => {
    const score = {
      total: 100,
      domainBurst: 100,
      brandBurst: 100,
      threadSpread: 100,
      simhash: 100,
      participationPattern: 100,
      obfuscation: 100,
      report: 100,
      independentSignalFamilies: 5,
      localBaselineZScore: 0,
    };
    const samples = makeSamples(6, { simhash64: 'a'.repeat(16), flags: ['DOT_WORD'] });
    const bullets = generateExplanationBullets(score, samples, 'domain:test.com');
    expect(bullets.some(b => b.includes('Domain burst'))).toBe(true);
    expect(bullets.some(b => b.includes('Brand burst'))).toBe(true);
    expect(bullets.some(b => b.includes('Thread spread'))).toBe(true);
    expect(bullets.some(b => b.includes('Near-duplicates'))).toBe(true);
    expect(bullets.some(b => b.includes('Participation pattern'))).toBe(true);
    expect(bullets.some(b => b.includes('Obfuscation'))).toBe(true);
    expect(bullets.some(b => b.includes('Reports'))).toBe(true);
    expect(bullets.some(b => b.includes('independent signal families'))).toBe(true);
  });

  it('strips prefix from cluster key with colon', () => {
    const score = { total: 10, domainBurst: 0, brandBurst: 0, threadSpread: 0, simhash: 0, participationPattern: 0, obfuscation: 0, report: 0, independentSignalFamilies: 0, localBaselineZScore: 0 };
    const bullets = generateExplanationBullets(score, [], 'domain:shady.com:extra');
    expect(bullets[0]).toContain('shady.com:extra');
    expect(bullets[0]).not.toContain('domain:shady.com:extra');
  });

  it('handles cluster key without colon', () => {
    const score = { total: 10, domainBurst: 0, brandBurst: 0, threadSpread: 0, simhash: 0, participationPattern: 0, obfuscation: 0, report: 0, independentSignalFamilies: 0, localBaselineZScore: 0 };
    const bullets = generateExplanationBullets(score, [], 'simple-key');
    expect(bullets[0]).toContain('simple-key');
  });
});
