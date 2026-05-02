import { describe, it, expect } from 'vitest';
import {
  getEffectiveCaps,
  setMemoryPressure,
  isUnderMemoryPressure,
  refreshMemoryPressure,
} from './memory-pressure.service';
import { DEFAULT_CONFIG } from '../types/config';

describe('memory-pressure', () => {
  it('returns normal caps when no pressure', () => {
    setMemoryPressure(false);
    const caps = getEffectiveCaps();
    expect(caps.evidenceCap).toBe(DEFAULT_CONFIG.evidenceCap);
    expect(caps.evidenceCapPerSignal).toBe(DEFAULT_CONFIG.evidenceCapPerSignal);
    expect(caps.maxExamplesPerDossier).toBe(DEFAULT_CONFIG.maxExamplesPerDossier);
    expect(caps.evidenceTTLDays).toBe(7);
    expect(caps.dossierTTLDays).toBe(30);
  });

  it('returns pressure caps when under pressure', () => {
    setMemoryPressure(true);
    expect(isUnderMemoryPressure()).toBe(true);
    const caps = getEffectiveCaps();
    expect(caps.evidenceCap).toBe(5_000);
    expect(caps.evidenceCapPerSignal).toBe(25);
    expect(caps.maxExamplesPerDossier).toBe(3);
    expect(caps.evidenceTTLDays).toBe(3);
    expect(caps.dossierTTLDays).toBe(14);
    setMemoryPressure(false);
  });

  it('normal caps match DEFAULT_CONFIG values', () => {
    setMemoryPressure(false);
    const caps = getEffectiveCaps();
    expect(caps.evidenceCap).toBe(10_000);
    expect(caps.evidenceCapPerSignal).toBe(50);
    expect(caps.maxExamplesPerDossier).toBe(5);
  });

  it('activates pressure automatically when configured caps exceed the estimate budget', () => {
    const pressure = refreshMemoryPressure({
      ...DEFAULT_CONFIG,
      evidenceCap: 2_000_000,
      evidenceCapPerSignal: 500,
      maxExamplesPerDossier: 20,
    });

    expect(pressure).toBe(true);
    expect(isUnderMemoryPressure()).toBe(true);
    expect(getEffectiveCaps().evidenceCap).toBe(5_000);
    setMemoryPressure(false);
  });

  it('uses configured caps when not under pressure', () => {
    setMemoryPressure(false);
    const caps = getEffectiveCaps({
      ...DEFAULT_CONFIG,
      evidenceCap: 12_000,
      evidenceCapPerSignal: 75,
      maxExamplesPerDossier: 8,
    });

    expect(caps.evidenceCap).toBe(12_000);
    expect(caps.evidenceCapPerSignal).toBe(75);
    expect(caps.maxExamplesPerDossier).toBe(8);
  });
});
