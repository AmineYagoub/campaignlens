import { describe, it, expect } from 'vitest';
import { extractBrandKeys } from './brand-extractor.service';

describe('extractBrandKeys', () => {
  it('derives keys from domains', () => {
    const keys = extractBrandKeys('Check this out', ['example.com']);
    expect(keys).toContain('example');
    expect(keys).toContain('example.com');
  });

  it('finds repeated capitalized phrases', () => {
    const keys = extractBrandKeys(
      'I love Mega Product because Mega Product is great',
      []
    );
    expect(keys.some((k) => k.includes('mega product'))).toBe(true);
  });

  it('deduplicates keys', () => {
    const keys = extractBrandKeys('test', ['example.com']);
    // Both 'example' and 'example.com' should be present
    // but 'example' should not appear twice
    const exampleCount = keys.filter((k) => k === 'example').length;
    expect(exampleCount).toBeLessThanOrEqual(1);
  });

  it('handles empty input', () => {
    const keys = extractBrandKeys('', []);
    expect(keys).toEqual([]);
  });

  it('handles text with no brands', () => {
    const keys = extractBrandKeys('just a normal comment about cats', []);
    expect(keys).toEqual([]);
  });

  it('extracts from multiple domains', () => {
    const keys = extractBrandKeys('test', ['shop.example.com', 'store.other.com']);
    expect(keys.some((k) => k.includes('example'))).toBe(true);
    expect(keys.some((k) => k.includes('other'))).toBe(true);
  });

  it('limits to 20 keys', () => {
    const domains = Array.from({ length: 30 }, (_, i) => `brand${i}.com`);
    const keys = extractBrandKeys('test', domains);
    expect(keys.length).toBeLessThanOrEqual(20);
  });
});
