import { describe, it, expect } from 'vitest';
import { extractSignals, detectObfuscation } from './signal-extraction.service';

describe('detectObfuscation', () => {
  it('detects DOT_WORD pattern', () => {
    const flags = detectObfuscation('Visit example dot com for deals');
    expect(flags).toContain('DOT_WORD');
  });

  it('detects BRACKET_DOT pattern', () => {
    const flags = detectObfuscation('Go to example[dot]com');
    expect(flags).toContain('BRACKET_DOT');
  });

  it('detects HXXP pattern', () => {
    const flags = detectObfuscation('Use hxxp://example.com');
    expect(flags).toContain('HXXP');
  });

  it('detects SPACED_DOMAIN pattern', () => {
    const flags = detectObfuscation('Visit example dot com today');
    expect(flags).toContain('SPACED_DOMAIN');
  });

  it('detects SEARCH_INSTRUCTION pattern', () => {
    const flags = detectObfuscation('Search google.com/search?q=best+laptop');
    expect(flags).toContain('SEARCH_INSTRUCTION');
  });

  it('detects AFFILIATE_PARAM pattern', () => {
    const flags = detectObfuscation('https://shop.com?ref=affiliate123');
    expect(flags).toContain('AFFILIATE_PARAM');
  });

  it('detects URL_SHORTENER pattern', () => {
    const flags = detectObfuscation('Check bit.ly/abc123');
    expect(flags).toContain('URL_SHORTENER');
  });

  it('returns empty array for clean text', () => {
    const flags = detectObfuscation('Just a normal comment about cats');
    expect(flags).toEqual([]);
  });

  it('detects multiple patterns at once', () => {
    const flags = detectObfuscation('Visit hxxp://bit.ly/abc?ref=spam');
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
      expect(detectObfuscation(text)).toEqual([]);
    }
  });
});

describe('extractSignals', () => {
  it('extracts domain signals from text', () => {
    const result = extractSignals(
      'normalized text',
      'Check out https://example.com for the best deals'
    );
    expect(result.domainSignals.length).toBeGreaterThanOrEqual(1);
    expect(result.domainSignals[0]!.normalized).toBe('example.com');
  });

  it('detects obfuscation flags', () => {
    const result = extractSignals(
      'normalized',
      'Visit example dot com today'
    );
    expect(result.obfuscationFlags.length).toBeGreaterThanOrEqual(1);
  });

  it('creates short excerpt', () => {
    const longText = 'A '.repeat(200);
    const result = extractSignals('normalized', longText);
    expect(result.shortExcerpt.length).toBeLessThanOrEqual(123); // 120 + '...'
    expect(result.shortExcerpt).toContain('...');
  });

  it('extracts brand keys', () => {
    const result = extractSignals(
      'normalized',
      'I love Example Brand and Example Brand products'
    );
    expect(result.brandKeys.length).toBeGreaterThanOrEqual(1);
    expect(result.brandKeys.some(k => k.includes('example brand'))).toBe(true);
  });

  it('handles text with no signals', () => {
    const result = extractSignals('normalized', 'Just a normal comment');
    expect(result.domainSignals).toEqual([]);
    expect(result.obfuscationFlags).toEqual([]);
    expect(result.brandKeys).toEqual([]);
    expect(result.shortExcerpt).toBe('Just a normal comment');
  });

  it('full pipeline with obfuscated URL', () => {
    const result = extractSignals(
      'normalized',
      'Get deals at hxxp://shop.example.com?ref=spammer — also try shop[dot]example[dot]com'
    );
    expect(result.domainSignals.length).toBeGreaterThanOrEqual(1);
    expect(result.obfuscationFlags).toContain('HXXP');
    expect(result.obfuscationFlags).toContain('AFFILIATE_PARAM');
  });
});
