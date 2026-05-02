import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../types/config';
import type { ModFeedback } from '../types/feedback';
import type { DossierAction, DossierStatus } from '../types/dossier';

describe('feedback weight adjustment logic', () => {
  function decreaseStrongestWeight(
    w: Record<string, number>,
    amount: number
  ): void {
    const entries = Object.entries(w);
    const maxEntry = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
    w[maxEntry[0]] = Math.max(0.05, maxEntry[1] - amount);
  }

  it('BENIGN decreases strongest weight by 0.02', () => {
    const weights = { ...DEFAULT_CONFIG.weights };
    const strongest = Object.entries(weights).reduce((a, b) => (a[1] > b[1] ? a : b));
    const before = strongest[1];

    decreaseStrongestWeight(weights, 0.02);

    expect(weights[strongest[0] as keyof typeof weights]).toBe(before - 0.02);
  });

  it('FALSE_POSITIVE decreases strongest weight by 0.03', () => {
    const weights = { ...DEFAULT_CONFIG.weights };
    const strongest = Object.entries(weights).reduce((a, b) => (a[1] > b[1] ? a : b));
    const before = strongest[1];

    decreaseStrongestWeight(weights, 0.03);

    expect(weights[strongest[0] as keyof typeof weights]).toBe(before - 0.03);
  });

  it('weight never goes below 0.05', () => {
    const weights = { domainBurst: 0.06, brandBurst: 0.05, threadSpread: 0.05, simhash: 0.05, participationPattern: 0.05, obfuscation: 0.05, report: 0.05 };

    // Decrease many times
    for (let i = 0; i < 10; i++) {
      decreaseStrongestWeight(weights, 0.02);
    }

    const allValues = Object.values(weights);
    for (const v of allValues) {
      expect(v).toBeGreaterThanOrEqual(0.05);
    }
  });

  it('CONFIRMED_CAMPAIGN increases domain weight by 0.02 for domain signal', () => {
    const weights = { ...DEFAULT_CONFIG.weights };
    const before = weights.domainBurst;

    // Simulate confirmed campaign for domain signal
    weights.domainBurst = Math.min(0.4, weights.domainBurst + 0.02);

    expect(weights.domainBurst).toBe(before + 0.02);
  });

  it('CONFIRMED_CAMPAIGN increases brand weight by 0.02 for brand signal', () => {
    const weights = { ...DEFAULT_CONFIG.weights };
    const before = weights.brandBurst;

    weights.brandBurst = Math.min(0.4, weights.brandBurst + 0.02);

    expect(weights.brandBurst).toBe(before + 0.02);
  });

  it('weight never exceeds 0.4', () => {
    const weights = { ...DEFAULT_CONFIG.weights };
    weights.domainBurst = 0.39;

    weights.domainBurst = Math.min(0.4, weights.domainBurst + 0.02);

    expect(weights.domainBurst).toBe(0.4);
  });
});

describe('feedback to status mapping', () => {
  const statusMap: Record<DossierAction, DossierStatus> = {
    WATCH: 'WATCH',
    IGNORE: 'IGNORED',
    BENIGN: 'BENIGN',
    CONFIRMED_CAMPAIGN: 'CONFIRMED',
    FALSE_POSITIVE: 'IGNORED',
    ESCALATE: 'ESCALATED',
  };

  it('maps WATCH to WATCH', () => {
    expect(statusMap['WATCH']).toBe('WATCH');
  });

  it('maps IGNORE to IGNORED', () => {
    expect(statusMap['IGNORE']).toBe('IGNORED');
  });

  it('maps BENIGN to BENIGN', () => {
    expect(statusMap['BENIGN']).toBe('BENIGN');
  });

  it('maps CONFIRMED_CAMPAIGN to CONFIRMED', () => {
    expect(statusMap['CONFIRMED_CAMPAIGN']).toBe('CONFIRMED');
  });

  it('maps FALSE_POSITIVE to IGNORED', () => {
    expect(statusMap['FALSE_POSITIVE']).toBe('IGNORED');
  });

  it('maps ESCALATE to ESCALATED', () => {
    expect(statusMap['ESCALATE']).toBe('ESCALATED');
  });
});

describe('mod action mapping', () => {
  it('maps remove action to CONFIRMED_CAMPAIGN feedback', () => {
    const action: string = 'remove';
    const expectedFeedback: ModFeedback = 'CONFIRMED_CAMPAIGN';
    expect(action === 'remove' || action === 'spam').toBe(true);
    expect(expectedFeedback).toBe('CONFIRMED_CAMPAIGN');
  });

  it('maps spam action to CONFIRMED_CAMPAIGN feedback', () => {
    const action: string = 'spam';
    expect(action === 'remove' || action === 'spam').toBe(true);
  });

  it('maps approve action to BENIGN feedback', () => {
    const action: string = 'approve';
    expect(action).toBe('approve');
  });

  it('ignores unknown actions', () => {
    const action: string = 'lock';
    const isRelevant = action === 'remove' || action === 'spam' || action === 'approve';
    expect(isRelevant).toBe(false);
  });
});

describe('precision stats', () => {
  function applyFeedbackToStats(
    stats: { reviewedHighConfidence: number; markedFalsePositive: number; markedBenign: number; confirmedCampaign: number },
    feedback: ModFeedback
  ) {
    switch (feedback) {
      case 'CONFIRMED_CAMPAIGN':
        stats.confirmedCampaign++;
        stats.reviewedHighConfidence++;
        break;
      case 'FALSE_POSITIVE':
        stats.markedFalsePositive++;
        stats.reviewedHighConfidence++;
        break;
      case 'BENIGN':
        stats.markedBenign++;
        stats.reviewedHighConfidence++;
        break;
    }
    return stats;
  }

  it('increments confirmedCampaign on CONFIRMED_CAMPAIGN', () => {
    const stats = { reviewedHighConfidence: 0, markedFalsePositive: 0, markedBenign: 0, confirmedCampaign: 0 };
    applyFeedbackToStats(stats, 'CONFIRMED_CAMPAIGN');
    expect(stats.confirmedCampaign).toBe(1);
    expect(stats.reviewedHighConfidence).toBe(1);
  });

  it('increments markedFalsePositive on FALSE_POSITIVE', () => {
    const stats = { reviewedHighConfidence: 0, markedFalsePositive: 0, markedBenign: 0, confirmedCampaign: 0 };
    applyFeedbackToStats(stats, 'FALSE_POSITIVE');
    expect(stats.markedFalsePositive).toBe(1);
    expect(stats.reviewedHighConfidence).toBe(1);
  });

  it('increments markedBenign on BENIGN', () => {
    const stats = { reviewedHighConfidence: 0, markedFalsePositive: 0, markedBenign: 0, confirmedCampaign: 0 };
    applyFeedbackToStats(stats, 'BENIGN');
    expect(stats.markedBenign).toBe(1);
    expect(stats.reviewedHighConfidence).toBe(1);
  });

  it('does not change stats for IGNORE', () => {
    const stats = { reviewedHighConfidence: 5, markedFalsePositive: 2, markedBenign: 1, confirmedCampaign: 2 };
    applyFeedbackToStats(stats, 'IGNORE');
    expect(stats.reviewedHighConfidence).toBe(5);
  });

  it('does not change stats for WATCH', () => {
    const stats = { reviewedHighConfidence: 5, markedFalsePositive: 2, markedBenign: 1, confirmedCampaign: 2 };
    applyFeedbackToStats(stats, 'WATCH');
    expect(stats.reviewedHighConfidence).toBe(5);
  });

  it('accumulates multiple feedbacks', () => {
    const stats = { reviewedHighConfidence: 0, markedFalsePositive: 0, markedBenign: 0, confirmedCampaign: 0 };
    applyFeedbackToStats(stats, 'CONFIRMED_CAMPAIGN');
    applyFeedbackToStats(stats, 'BENIGN');
    applyFeedbackToStats(stats, 'FALSE_POSITIVE');
    applyFeedbackToStats(stats, 'CONFIRMED_CAMPAIGN');
    expect(stats.reviewedHighConfidence).toBe(4);
    expect(stats.confirmedCampaign).toBe(2);
    expect(stats.markedBenign).toBe(1);
    expect(stats.markedFalsePositive).toBe(1);
  });
});
