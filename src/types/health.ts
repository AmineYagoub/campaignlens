import type { BaselineMode, CampaignLensConfig } from './config';

export type HealthState = 'healthy' | 'degraded';

export type HealthCheck = {
  status: HealthState;
  message?: string;
};

export type HealthReport = {
  status: HealthState;
  checkedAt: number;
  version: string;
  subredditName?: string;
  checks: {
    redis: HealthCheck;
    config: HealthCheck;
    baseline: HealthCheck;
    memory: HealthCheck;
  };
  metrics: {
    activeDossiers: number;
    actionHistoryRecords: number;
    baselineMode: BaselineMode;
    memoryPressure: boolean;
    effectiveCaps: {
      evidenceCap: number;
      evidenceCapPerSignal: number;
      maxExamplesPerDossier: number;
      evidenceTTLDays: number;
      dossierTTLDays: number;
    };
    config: Pick<
      CampaignLensConfig,
      'threshold' | 'highConfidenceThreshold' | 'requiredSignalFamilies' | 'windowMinutes'
    >;
  };
};
