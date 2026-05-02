import { describe, it, expect } from 'vitest';
import {
  createShingles,
  simhash64,
  hammingDistance64,
  simhashSimilarity,
  simhashPrefixes,
} from './simhash.service';

describe('createShingles', () => {
  it('creates overlapping n-grams', () => {
    const shingles = createShingles(['a', 'b', 'c', 'd'], 3);
    expect(shingles).toEqual([
      ['a', 'b', 'c'],
      ['b', 'c', 'd'],
    ]);
  });

  it('returns single shingle when tokens < size', () => {
    const shingles = createShingles(['a', 'b'], 3);
    expect(shingles).toEqual([['a', 'b']]);
  });

  it('handles exact size match', () => {
    const shingles = createShingles(['a', 'b', 'c'], 3);
    expect(shingles).toEqual([['a', 'b', 'c']]);
  });

  it('handles single token', () => {
    const shingles = createShingles(['a'], 3);
    expect(shingles).toEqual([['a']]);
  });
});

describe('simhash64', () => {
  it('is deterministic', () => {
    const a = simhash64('The quick brown fox jumps over the lazy dog');
    const b = simhash64('The quick brown fox jumps over the lazy dog');
    expect(a).toBe(b);
  });

  it('identical sentences have distance 0', () => {
    const a = simhash64('This product is amazing and everyone should buy it');
    const b = simhash64('This product is amazing and everyone should buy it');
    expect(hammingDistance64(a, b)).toBe(0);
  });

  it('slightly varied paragraphs have distance <= 14 (weak similarity)', () => {
    const base = 'I have been using this amazing product for three months now and the results are incredible. My productivity improved significantly after switching to this brand. The quality is outstanding compared to other options on the market.';
    const varied = 'I have been using this amazing product for three months now and the results are incredible. My productivity improved dramatically after switching to this brand. The quality is outstanding compared to other options on the market.';
    const a = simhash64(base);
    const b = simhash64(varied);
    expect(hammingDistance64(a, b)).toBeLessThanOrEqual(14);
  });

  it('near-identical text with one word difference has distance <= 6', () => {
    const base = 'I have been using this amazing product for three months now and the results are incredible. My productivity improved significantly after switching to this brand. The quality is outstanding compared to other options on the market. I would definitely recommend this to anyone looking for a reliable solution.';
    const varied = 'I have been using this amazing product for three months now and the results are incredible. My productivity improved significantly after switching to this brand. The quality is outstanding compared to other options on the market. I would definitely recommend this to anyone looking for a reliable solution!';
    const a = simhash64(base);
    const b = simhash64(varied);
    expect(hammingDistance64(a, b)).toBeLessThanOrEqual(6);
  });

  it('unrelated sentences have distance > 15', () => {
    const a = simhash64('The weather is nice today and I love going outside');
    const b = simhash64('Buy cheap authentic Rolex watches at discount prices');
    expect(hammingDistance64(a, b)).toBeGreaterThan(15);
  });

  it('returns 0 for empty string', () => {
    expect(simhash64('')).toBe(0n);
  });

  it('handles single word', () => {
    const hash = simhash64('hello');
    expect(typeof hash).toBe('bigint');
    expect(hash).not.toBe(0n);
  });
});

describe('hammingDistance64', () => {
  it('returns 0 for identical values', () => {
    const v = 0xDEADBEEFn;
    expect(hammingDistance64(v, v)).toBe(0);
  });

  it('returns 1 for values differing by one bit', () => {
    const a = 0n;
    const b = 1n;
    expect(hammingDistance64(a, b)).toBe(1);
  });

  it('returns 64 for max XOR', () => {
    const a = 0n;
    const b = (1n << 64n) - 1n;
    expect(hammingDistance64(a, b)).toBe(64);
  });
});

describe('simhashSimilarity', () => {
  it('returns 100 for identical hashes', () => {
    const h = simhash64('test input');
    expect(simhashSimilarity(h, h)).toBe(100);
  });

  it('returns lower similarity for different hashes', () => {
    const a = simhash64('completely different text one');
    const b = simhash64('completely different text two');
    expect(simhashSimilarity(a, b)).toBeLessThan(100);
  });

  it('returns a percentage between 0 and 100', () => {
    const a = simhash64('alpha');
    const b = simhash64('beta');
    const sim = simhashSimilarity(a, b);
    expect(sim).toBeGreaterThanOrEqual(0);
    expect(sim).toBeLessThanOrEqual(100);
  });
});

describe('simhashPrefixes', () => {
  it('returns exactly 4 prefixes', () => {
    const hash = simhash64('test');
    const prefixes = simhashPrefixes(hash);
    expect(prefixes).toHaveLength(4);
  });

  it('each prefix is 4 hex characters', () => {
    const hash = simhash64('test input for prefixes');
    const prefixes = simhashPrefixes(hash);
    for (const prefix of prefixes) {
      expect(prefix).toHaveLength(4);
      expect(prefix).toMatch(/^[0-9a-f]{4}$/);
    }
  });

  it('prefixes reconstruct the full hex', () => {
    const hash = simhash64('reconstruction test');
    const prefixes = simhashPrefixes(hash);
    const reconstructed = prefixes.join('');
    expect(reconstructed).toBe(hash.toString(16).padStart(16, '0'));
  });
});
