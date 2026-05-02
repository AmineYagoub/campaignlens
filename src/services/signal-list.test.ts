import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../types/config';
import {
  filterAllowlistedSignals,
  isAllowlistedSignal,
  isWatchedSignal,
  signalValue,
} from './signal-list.service';

describe('signal-list service', () => {
  it('extracts the value portion of namespaced signal keys', () => {
    expect(signalValue('domain:example.com')).toBe('example.com');
    expect(signalValue('brand:Example')).toBe('Example');
    expect(signalValue('plain')).toBe('plain');
  });

  it('matches allowlist entries by full signal key or value', () => {
    const config = {
      ...DEFAULT_CONFIG,
      allowlist: ['trusted.example', 'brand:trusted-brand'],
    };

    expect(isAllowlistedSignal('domain:trusted.example', config)).toBe(true);
    expect(isAllowlistedSignal('brand:trusted-brand', config)).toBe(true);
    expect(isAllowlistedSignal('domain:other.example', config)).toBe(false);
  });

  it('filters allowlisted signals without removing unrelated signals', () => {
    const config = {
      ...DEFAULT_CONFIG,
      allowlist: ['trusted.example'],
    };

    expect(filterAllowlistedSignals(['domain:trusted.example', 'domain:other.example'], config)).toEqual([
      'domain:other.example',
    ]);
  });

  it('matches watchlist entries case-insensitively', () => {
    const config = {
      ...DEFAULT_CONFIG,
      blocklist: ['Suspicious.Example'],
    };

    expect(isWatchedSignal('domain:suspicious.example', config)).toBe(true);
  });
});
