import { describe, it, expect } from 'vitest';
import type { EvidenceSample, CampaignShapeScore } from '../types/dossier';
import { DEFAULT_CONFIG } from '../types/config';
import { calculateCampaignScore, generateExplanationBullets } from './scoring.service';
import { categorizeCampaign, clusterKeysForEvidence } from './dossier.service';

// We test the dossier service indirectly through scoring integration
// and the helper logic. Redis-dependent functions are tested via
// the API route integration tests.

function makeSample(overrides: Partial<EvidenceSample> = {}): EvidenceSample {
  return {
    id: `ev-${Math.random().toString(36).slice(2, 8)}`,
    contentId: `t1_${Math.random().toString(36).slice(2, 8)}`,
    kind: 'comment',
    createdAt: Date.now(),
    threadId: 't3_abc',
    signalKeys: ['domain:example.com', 'brand:example'],
    shortExcerpt: 'Check out example.com for deals',
    matchedFragments: ['example.com', 'example'],
    simhash64: 'a1b2c3d4e5f6a7b8',
    flags: [],
    ...overrides,
  };
}

describe('dossier helper logic', () => {
  it('clusters domain-backed evidence by domain instead of duplicate brand keys', () => {
    const sample = makeSample({
      signalKeys: [
        'domain:demo-campaign.example',
        'brand:demo-campaign.example',
        'brand:demo-campaign',
        'brand:campaign',
      ],
    });

    expect(clusterKeysForEvidence(sample)).toEqual(['domain:demo-campaign.example']);
  });

  it('keeps brand clustering for brand-only evidence', () => {
    const sample = makeSample({
      signalKeys: ['brand:flatworm', 'brand:flatworm'],
    });

    expect(clusterKeysForEvidence(sample)).toEqual(['brand:flatworm']);
  });

  it('drops a suffix domain fragment when a more specific hyphenated domain exists', () => {
    const sample = makeSample({
      signalKeys: ['domain:campaign.example', 'domain:demo-campaign.example'],
    });

    expect(clusterKeysForEvidence(sample)).toEqual(['domain:demo-campaign.example']);
  });

  it('categorizes domain campaigns as commercial promotion by default', () => {
    expect(categorizeCampaign('domain:example.com', [makeSample()], DEFAULT_CONFIG)).toBe('COMMERCIAL_PROMOTION');
  });

  it('categorizes configured harmful narrative terms without semantic overclaiming', () => {
    const sample = makeSample({
      shortExcerpt: 'Repeated coded slogan from the harm watchlist',
      matchedFragments: ['coded slogan'],
    });

    expect(
      categorizeCampaign('brand:coded-slogan', [sample], {
        ...DEFAULT_CONFIG,
        harmfulNarrativeWatchlist: ['coded slogan'],
      })
    ).toBe('POSSIBLE_HARMFUL_NARRATIVE');
  });

});

describe('dossier score threshold', () => {
  it('a cluster of 3 separate-thread samples reaches the default threshold', () => {
    const now = Date.now();
    const samples = Array.from({ length: 3 }, (_, i) =>
      makeSample({
        signalKeys: ['domain:shop.example.com', 'brand:example'],
        threadId: `t3_thread${i}`,
        createdAt: now - i * 5 * 60_000,
        shortExcerpt: 'same repeated recommendation for shop.example.com',
        simhash64: 'a1b2c3d4e5f6a7b8',
      })
    );

    const aggregates = {
      domainMentions: 3,
      brandMentions: 3,
      timeSpanMinutes: 10,
      localBaselineZScore: 5,
    };

    const score = calculateCampaignScore(samples, aggregates, 0, DEFAULT_CONFIG);
    expect(score.total).toBeGreaterThanOrEqual(DEFAULT_CONFIG.threshold);
  });

  it('single normal sample does not reach threshold', () => {
    const sample = makeSample({ signalKeys: ['domain:normal-site.com'] });
    const aggregates = {
      domainMentions: 1,
      brandMentions: 0,
      timeSpanMinutes: 0,
      localBaselineZScore: 0,
    };

    const score = calculateCampaignScore([sample], aggregates, 0, DEFAULT_CONFIG);
    expect(score.total).toBeLessThan(45);
  });

  it('campaign with obfuscation and spread exceeds threshold', () => {
    const now = Date.now();
    const samples = Array.from({ length: 6 }, (_, i) =>
      makeSample({
        signalKeys: ['domain:spam-site.com'],
        threadId: `t3_thread${i}`,
        createdAt: now - i * 10 * 60_000,
        simhash64: 'a1b2c3d4e5f6a7b8',
        flags: ['HXXP', 'URL_SHORTENER'],
      })
    );

    const aggregates = {
      domainMentions: 8,
      brandMentions: 0,
      timeSpanMinutes: 50,
      localBaselineZScore: 3,
    };

    const score = calculateCampaignScore(samples, aggregates, 2, DEFAULT_CONFIG);
    expect(score.total).toBeGreaterThanOrEqual(45);
    expect(score.obfuscation).toBe(100);
    expect(score.report).toBe(40);
  });
});

describe('explanation bullets for dossier', () => {
  it('includes domain burst bullet when score >= 50', () => {
    const score: CampaignShapeScore = {
      total: 60,
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

    const bullets = generateExplanationBullets(score, [], 'domain:shop.com');
    expect(bullets.some((b) => b.includes('Domain burst'))).toBe(true);
  });

  it('includes total score and signal label', () => {
    const score: CampaignShapeScore = {
      total: 55,
      domainBurst: 50,
      brandBurst: 0,
      threadSpread: 0,
      simhash: 0,
      participationPattern: 0,
      obfuscation: 0,
      report: 0,
      independentSignalFamilies: 1,
      localBaselineZScore: 0,
    };

    const bullets = generateExplanationBullets(score, [], 'domain:shop.com');
    expect(bullets[0]).toContain('55 total score');
    expect(bullets[0]).toContain('shop.com');
  });

  it('includes signal families when >= 3', () => {
    const score: CampaignShapeScore = {
      total: 80,
      domainBurst: 75,
      brandBurst: 50,
      threadSpread: 40,
      simhash: 0,
      participationPattern: 0,
      obfuscation: 0,
      report: 0,
      independentSignalFamilies: 3,
      localBaselineZScore: 0,
    };

    const bullets = generateExplanationBullets(score, [], 'domain:test.com');
    expect(bullets.some((b) => b.includes('3 independent signal families'))).toBe(true);
  });

  it('skips low-score bullets', () => {
    const score: CampaignShapeScore = {
      total: 10,
      domainBurst: 0,
      brandBurst: 0,
      threadSpread: 0,
      simhash: 0,
      participationPattern: 0,
      obfuscation: 0,
      report: 0,
      independentSignalFamilies: 0,
      localBaselineZScore: 0,
    };

    const bullets = generateExplanationBullets(score, [], 'domain:quiet.com');
    // Should only have the total score line
    expect(bullets).toHaveLength(1);
    expect(bullets[0]).toContain('10 total score');
  });
});
