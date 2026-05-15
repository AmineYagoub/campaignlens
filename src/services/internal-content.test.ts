import { describe, expect, it } from 'vitest';
import { isCampaignLensDashboardPost, isCampaignLensInternalDossier } from './internal-content.service';
import type { EvidenceDossier } from '../types/dossier';

function makeDossier(excerpt: string): EvidenceDossier {
  return {
    id: 'dossier-1',
    clusterKey: 'brand:atlas',
    category: 'UNKNOWN',
    status: 'NEEDS_REVIEW',
    signalKey: 'brand:atlas',
    score: {
      total: 55,
      domainBurst: 0,
      brandBurst: 50,
      threadSpread: 0,
      simhash: 20,
      participationPattern: 0,
      obfuscation: 0,
      report: 0,
      independentSignalFamilies: 1,
      localBaselineZScore: 0,
    },
    examples: [
      {
        excerpt,
        matchedFragments: ['atlas'],
        flags: [],
        threadId: 't3_post',
        createdAt: 1,
      },
    ],
    timeline: [],
    explanationBullets: [],
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('internal CampaignLens content detection', () => {
  it('detects CampaignLens dashboard custom posts', () => {
    expect(
      isCampaignLensDashboardPost('CampaignLens Atlas', 'CampaignLens Atlas moderator dashboard.')
    ).toBe(true);
  });

  it('does not block ordinary posts mentioning CampaignLens', () => {
    expect(
      isCampaignLensDashboardPost('CampaignLens Atlas review', 'People are discussing a launch.')
    ).toBe(false);
  });

  it('detects internal dashboard-only dossiers', () => {
    expect(
      isCampaignLensInternalDossier(makeDossier('CampaignLens Atlas moderator dashboard.'))
    ).toBe(true);
  });

  it('detects older dossiers whose excerpt includes the custom post title and fallback text', () => {
    expect(
      isCampaignLensInternalDossier(makeDossier('CampaignLens Atlas CampaignLens Atlas moderator dashboard.'))
    ).toBe(true);
  });

  it('does not hide real dossiers with non-dashboard evidence', () => {
    expect(
      isCampaignLensInternalDossier(makeDossier('Check repeated mentions of test-campaign.example'))
    ).toBe(false);
  });
});
