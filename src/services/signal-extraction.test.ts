import { describe, it, expect } from 'vitest';
import { extractSignals } from './signal-extraction.service';

describe('detectObfuscation', () => {
  it('detects DOT_WORD pattern', () => {
    const flags = extractSignals('Visit example dot com for deals').obfuscationFlags;
    expect(flags).toContain('DOT_WORD');
  });

  it('detects BRACKET_DOT pattern', () => {
    const flags = extractSignals('Go to example[dot]com').obfuscationFlags;
    expect(flags).toContain('BRACKET_DOT');
  });

  it('detects HXXP pattern', () => {
    const flags = extractSignals('Use hxxp://example.com').obfuscationFlags;
    expect(flags).toContain('HXXP');
  });

  it('detects SPACED_DOMAIN pattern', () => {
    const flags = extractSignals('Visit example dot com today').obfuscationFlags;
    expect(flags).toContain('SPACED_DOMAIN');
  });

  it('detects SEARCH_INSTRUCTION pattern', () => {
    const flags = extractSignals('Search google.com/search?q=best+laptop').obfuscationFlags;
    expect(flags).toContain('SEARCH_INSTRUCTION');
  });

  it('detects AFFILIATE_PARAM pattern', () => {
    const flags = extractSignals('https://shop.com?ref=affiliate123').obfuscationFlags;
    expect(flags).toContain('AFFILIATE_PARAM');
  });

  it('detects URL_SHORTENER pattern', () => {
    const flags = extractSignals('Check bit.ly/abc123').obfuscationFlags;
    expect(flags).toContain('URL_SHORTENER');
  });

  it('returns empty array for clean text', () => {
    const flags = extractSignals('Just a normal comment about cats').obfuscationFlags;
    expect(flags).toEqual([]);
  });

  it('detects multiple patterns at once', () => {
    const flags = extractSignals('Visit hxxp://bit.ly/abc?ref=spam').obfuscationFlags;
    expect(flags).toContain('HXXP');
    expect(flags).toContain('AFFILIATE_PARAM');
    expect(flags).toContain('URL_SHORTENER');
    expect(flags.length).toBeGreaterThanOrEqual(3);
  });

  it('no false positives on normal text', () => {
    const cases = [
      'I really like this product',
      'The website is down today',
      'Check out this cool article about web development',
      'What do you think about the new update?',
    ];
    for (const text of cases) {
      expect(extractSignals(text).obfuscationFlags).toEqual([]);
    }
  });
});

describe('extractSignals', () => {
  it('extracts domain signals from text', () => {
    const result = extractSignals('Check out https://example.com for the best deals');
    expect(result.domainSignals.length).toBeGreaterThanOrEqual(1);
    expect(result.domainSignals[0]!.normalized).toBe('example.com');
  });

  it('detects obfuscation flags', () => {
    const result = extractSignals('Visit example dot com today');
    expect(result.obfuscationFlags.length).toBeGreaterThanOrEqual(1);
    expect(result.domainSignals[0]!.normalized).toBe('example.com');
  });

  it('creates short excerpt', () => {
    const longText = 'A '.repeat(200);
    const result = extractSignals(longText);
    expect(result.shortExcerpt.length).toBeLessThanOrEqual(123); // 120 + '...'
    expect(result.shortExcerpt).toContain('...');
  });

  it('extracts brand keys', () => {
    const result = extractSignals('I love Example Brand and Example Brand products');
    expect(result.brandKeys.length).toBeGreaterThanOrEqual(1);
    expect(result.brandKeys.some(k => k.includes('example brand'))).toBe(true);
  });

  it('handles text with no signals', () => {
    const result = extractSignals('Just a normal comment');
    expect(result.domainSignals).toEqual([]);
    expect(result.obfuscationFlags).toEqual([]);
    expect(result.brandKeys).toEqual([]);
    expect(result.shortExcerpt).toBe('Just a normal comment');
  });

  it('full pipeline with obfuscated URL', () => {
    const result = extractSignals('Get deals at hxxp://shop.example.com?ref=spammer — also try shop[dot]example[dot]com');
    expect(result.domainSignals.length).toBeGreaterThanOrEqual(1);
    expect(result.obfuscationFlags).toContain('HXXP');
    expect(result.obfuscationFlags).toContain('AFFILIATE_PARAM');
  });
});
