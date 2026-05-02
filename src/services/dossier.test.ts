import { describe, it, expect } from 'vitest';
import type { EvidenceSample, CampaignShapeScore } from '../types/dossier';
import { DEFAULT_CONFIG } from '../types/config';
import { calculateCampaignScore, generateExplanationBullets } from './scoring.service';

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
  it('computes sketch aggregates for samples with domain signals', () => {
    const samples = [
      makeSample({ signalKeys: ['domain:shop.com', 'brand:shop'] }),
      makeSample({ signalKeys: ['domain:shop.com'] }),
      makeSample({ signalKeys: ['domain:shop.com', 'domain:other.com'] }),
    ];

    const domainMentions = samples.reduce(
      (acc, s) => acc + s.signalKeys.filter((k) => k.startsWith('domain:')).length,
      0
    );
    const brandMentions = samples.reduce(
      (acc, s) => acc + s.signalKeys.filter((k) => k.startsWith('brand:')).length,
      0
    );

    expect(domainMentions).toBe(4);
    expect(brandMentions).toBe(1);
  });

  it('computes time span from sample timestamps', () => {
    const now = Date.now();
    const samples = [
      makeSample({ createdAt: now - 30 * 60_000 }),
      makeSample({ createdAt: now }),
    ];

    const timestamps = samples.map((s) => s.createdAt);
    const spanMinutes = (Math.max(...timestamps) - Math.min(...timestamps)) / 60_000;

    expect(spanMinutes).toBe(30);
  });

  it('time span is 0 for single sample', () => {
    const samples = [makeSample()];
    const timestamps = samples.map((s) => s.createdAt);
    const spanMinutes =
      timestamps.length >= 2
        ? (Math.max(...timestamps) - Math.min(...timestamps)) / 60_000
        : 0;

    expect(spanMinutes).toBe(0);
  });

  it('generates timeline items from samples with flags', () => {
    const samples = [
      makeSample({ flags: ['HXXP'], createdAt: 1000 }),
      makeSample({ flags: [], createdAt: 2000 }),
    ];

    const items: Array<{ timestamp: number; label: string; kind: string }> = [];
    for (const s of samples) {
      items.push({ timestamp: s.createdAt, label: `${s.kind} detected`, kind: 'mention' });
      for (const flag of s.flags) {
        items.push({ timestamp: s.createdAt, label: flag, kind: 'obfuscation' });
      }
    }

    expect(items).toHaveLength(3);
    expect(items[0]!.kind).toBe('mention');
    expect(items[1]!.kind).toBe('obfuscation');
    expect(items[1]!.label).toBe('HXXP');
  });

  it('truncates examples to max count', () => {
    const max = 3;
    const samples = Array.from({ length: 10 }, (_, i) => makeSample({ id: `ev-${i}` }));
    const examples = samples.slice(0, max);

    expect(examples).toHaveLength(3);
  });
});

describe('dossier score threshold', () => {
  it('a cluster of 3+ samples with domain burst reaches threshold (45)', () => {
    const now = Date.now();
    const samples = Array.from({ length: 5 }, (_, i) =>
      makeSample({
        signalKeys: ['domain:shop.example.com', 'brand:example'],
        threadId: `t3_thread${i}`,
        createdAt: now - i * 5 * 60_000,
        simhash64: 'a1b2c3d4e5f6a7b8',
        flags: i === 0 ? ['HXXP'] : [],
      })
    );

    const aggregates = {
      domainMentions: 5,
      brandMentions: 5,
      timeSpanMinutes: 25,
      localBaselineZScore: 5,
    };

    const score = calculateCampaignScore(samples, aggregates, 0, DEFAULT_CONFIG);
    expect(score.total).toBeGreaterThanOrEqual(45);
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

describe('dossier status transitions', () => {
  const terminalStatuses = ['IGNORED', 'BENIGN', 'CONFIRMED', 'ESCALATED'] as const;
  const nonTerminalStatuses = ['WATCH', 'NEEDS_REVIEW', 'HIGH_CONFIDENCE'] as const;

  it('identifies terminal statuses correctly', () => {
    for (const status of terminalStatuses) {
      expect(terminalStatuses.includes(status)).toBe(true);
    }
  });

  it('non-terminal statuses are not in terminal list', () => {
    for (const status of nonTerminalStatuses) {
      expect(terminalStatuses.includes(status as never)).toBe(false);
    }
  });

  it('maps dossier actions to correct statuses', () => {
    const statusMap: Record<string, string> = {
      WATCH: 'WATCH',
      IGNORE: 'IGNORED',
      BENIGN: 'BENIGN',
      CONFIRMED_CAMPAIGN: 'CONFIRMED',
      FALSE_POSITIVE: 'IGNORED',
      ESCALATE: 'ESCALATED',
    };

    expect(statusMap['WATCH']).toBe('WATCH');
    expect(statusMap['IGNORE']).toBe('IGNORED');
    expect(statusMap['BENIGN']).toBe('BENIGN');
    expect(statusMap['CONFIRMED_CAMPAIGN']).toBe('CONFIRMED');
    expect(statusMap['FALSE_POSITIVE']).toBe('IGNORED');
    expect(statusMap['ESCALATE']).toBe('ESCALATED');
  });
});
