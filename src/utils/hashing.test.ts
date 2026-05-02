import { describe, it, expect } from 'vitest';
import { fnv1a64, generateEventId, bloomHash } from './hashing';

describe('fnv1a64', () => {
  it('is consistent for the same input', () => {
    const a = fnv1a64('hello world');
    const b = fnv1a64('hello world');
    expect(a).toBe(b);
  });

  it('produces different hashes for different inputs', () => {
    const a = fnv1a64('hello');
    const b = fnv1a64('world');
    expect(a).not.toBe(b);
  });

  it('returns a 64-bit value', () => {
    const hash = fnv1a64('test');
    expect(hash >= 0n).toBe(true);
    expect(hash < 1n << 64n).toBe(true);
  });

  it('produces same hash regardless of call order', () => {
    const inputs = ['alpha', 'beta', 'gamma'];
    const hashes1 = inputs.map(fnv1a64);
    const hashes2 = inputs.map(fnv1a64);
    expect(hashes1).toEqual(hashes2);
  });

  it('handles empty string', () => {
    const hash = fnv1a64('');
    expect(typeof hash).toBe('bigint');
  });
});

describe('generateEventId', () => {
  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateEventId());
    }
    expect(ids.size).toBe(100);
  });

  it('contains a timestamp base36 component', () => {
    const id = generateEventId();
    expect(id).toContain('-');
    const parts = id.split('-');
    expect(parts.length).toBe(2);
    expect(parts[0]!.length).toBeGreaterThan(0);
    expect(parts[1]!.length).toBeGreaterThan(0);
  });
});

describe('bloomHash', () => {
  it('returns a 32-bit unsigned integer', () => {
    const h = bloomHash('test', 0);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xFFFFFFFF);
  });

  it('produces different values for different seeds', () => {
    const h0 = bloomHash('test', 0);
    const h1 = bloomHash('test', 1);
    const h2 = bloomHash('test', 2);
    expect(new Set([h0, h1, h2]).size).toBe(3);
  });

  it('is deterministic', () => {
    const a = bloomHash('hello', 42);
    const b = bloomHash('hello', 42);
    expect(a).toBe(b);
  });
});
