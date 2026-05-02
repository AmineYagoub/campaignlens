export type BaselineMode = 'COLD_START' | 'LEARNING' | 'CALIBRATED';

export type CampaignLensConfig = {
  threshold: number;
  highConfidenceThreshold: number;
  requiredSignalFamilies: number;
  weights: {
    domainBurst: number;
    brandBurst: number;
    threadSpread: number;
    simhash: number;
    participationPattern: number;
    obfuscation: number;
    report: number;
  };
  allowlist: string[];
  blocklist: string[];
  windowMinutes: number;
  evidenceCap: number;
  evidenceCapPerSignal: number;
  maxExamplesPerDossier: number;
};

export const DEFAULT_CONFIG: CampaignLensConfig = {
  threshold: 45,
  highConfidenceThreshold: 85,
  requiredSignalFamilies: 3,
  weights: {
    domainBurst: 0.25,
    brandBurst: 0.2,
    threadSpread: 0.2,
    simhash: 0.15,
    participationPattern: 0.1,
    obfuscation: 0.05,
    report: 0.05,
  },
  allowlist: [],
  blocklist: [],
  windowMinutes: 60,
  evidenceCap: 10_000,
  evidenceCapPerSignal: 50,
  maxExamplesPerDossier: 5,
};
