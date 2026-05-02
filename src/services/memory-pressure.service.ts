import { DEFAULT_CONFIG, type CampaignLensConfig } from '../types/config';

const MEMORY_LIMIT_MB = 400;
const REDIS_OVERHEAD_MB = 150;

interface MemoryCaps {
  evidenceCap: number;
  evidenceCapPerSignal: number;
  maxExamplesPerDossier: number;
  evidenceTTLDays: number;
  dossierTTLDays: number;
}

function estimateMemoryMB(caps: MemoryCaps): number {
  const bloomMB = 0.5;
  const counterMB = 40;
  const dedupMB = 10;
  const deletedMB = 1;
  const boundedSetsMB = 30;
  const evidenceMB = (caps.evidenceCap * 350) / (1024 * 1024);
  const dossierMB = 15;
  return bloomMB + counterMB + dedupMB + deletedMB + boundedSetsMB + evidenceMB + dossierMB + REDIS_OVERHEAD_MB;
}

const DEFAULT_EVIDENCE_TTL_DAYS = 7;
const DEFAULT_DOSSIER_TTL_DAYS = 30;

const PRESSURE_CAPS: MemoryCaps = {
  evidenceCap: 5_000,
  evidenceCapPerSignal: 25,
  maxExamplesPerDossier: 3,
  evidenceTTLDays: 3,
  dossierTTLDays: 14,
};

let pressureState = false;

export function setMemoryPressure(pressure: boolean): void {
  pressureState = pressure;
}

export function isUnderMemoryPressure(): boolean {
  return pressureState;
}

export function refreshMemoryPressure(config: CampaignLensConfig = DEFAULT_CONFIG): boolean {
  const normalCaps = buildNormalCaps(config);
  pressureState = estimateMemoryMB(normalCaps) > MEMORY_LIMIT_MB;
  return pressureState;
}

export function getEffectiveCaps(config: CampaignLensConfig = DEFAULT_CONFIG): MemoryCaps {
  return pressureState ? buildPressureCaps(config) : buildNormalCaps(config);
}

function buildNormalCaps(config: CampaignLensConfig): MemoryCaps {
  return {
    evidenceCap: config.evidenceCap,
    evidenceCapPerSignal: config.evidenceCapPerSignal,
    maxExamplesPerDossier: config.maxExamplesPerDossier,
    evidenceTTLDays: DEFAULT_EVIDENCE_TTL_DAYS,
    dossierTTLDays: DEFAULT_DOSSIER_TTL_DAYS,
  };
}

function buildPressureCaps(config: CampaignLensConfig): MemoryCaps {
  return {
    evidenceCap: Math.min(config.evidenceCap, PRESSURE_CAPS.evidenceCap),
    evidenceCapPerSignal: Math.min(config.evidenceCapPerSignal, PRESSURE_CAPS.evidenceCapPerSignal),
    maxExamplesPerDossier: Math.min(config.maxExamplesPerDossier, PRESSURE_CAPS.maxExamplesPerDossier),
    evidenceTTLDays: PRESSURE_CAPS.evidenceTTLDays,
    dossierTTLDays: PRESSURE_CAPS.dossierTTLDays,
  };
}

const NORMAL_CAPS = buildNormalCaps(DEFAULT_CONFIG);

export { NORMAL_CAPS, PRESSURE_CAPS, estimateMemoryMB, MEMORY_LIMIT_MB };
