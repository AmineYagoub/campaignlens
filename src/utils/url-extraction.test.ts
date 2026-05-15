import { describe, it, expect } from 'vitest';
import { extractUrls, normalizeDomain, extractDomainSignals } from './url-extraction';

describe('extractUrls', () => {
  it('extracts standard URLs', () => {
    const urls = extractUrls('Visit https://example.com for more info');
    expect(urls).toContain('https://example.com');
  });

  it('extracts URLs with paths', () => {
    const urls = extractUrls('Check https://example.com/path?q=1');
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('example.com/path');
  });

  it('extracts bare domains', () => {
    const urls = extractUrls('Visit example.com today');
    expect(urls.some((u) => u.includes('example.com'))).toBe(true);
  });

  it('extracts reserved .example playtest domains', () => {
    const urls = extractUrls('Visit demo-campaign.example today');
    expect(urls).toContain('demo-campaign.example');
  });

  it('deduplicates URLs by domain', () => {
    const urls = extractUrls('See https://example.com and also example.com again');
    // The full URL should be preferred over bare domain
    expect(urls.filter((u) => u.includes('example.com'))).toHaveLength(1);
  });

  it('returns empty array when no URLs', () => {
    expect(extractUrls('No URLs here')).toEqual([]);
  });

  it('extracts multiple URLs', () => {
    const urls = extractUrls('Visit https://a.com and https://b.com');
    expect(urls).toHaveLength(2);
  });
});

describe('normalizeDomain', () => {
  it('strips protocol', () => {
    expect(normalizeDomain('https://example.com')).toBe('example.com');
    expect(normalizeDomain('http://example.com')).toBe('example.com');
  });

  it('strips www', () => {
    expect(normalizeDomain('www.example.com')).toBe('example.com');
    expect(normalizeDomain('https://www.example.com')).toBe('example.com');
  });

  it('strips path and query', () => {
    expect(normalizeDomain('example.com/path?q=1')).toBe('example.com');
    expect(normalizeDomain('example.com/deep/path')).toBe('example.com');
  });

  it('lowercases', () => {
    expect(normalizeDomain('Example.COM')).toBe('example.com');
  });

  it('handles bare domain', () => {
    expect(normalizeDomain('example.com')).toBe('example.com');
  });
});

describe('extractDomainSignals', () => {
  it('detects affiliate params', () => {
    const signals = extractDomainSignals('Buy at https://store.com?ref=campaign123');
    expect(signals).toHaveLength(1);
    expect(signals[0]!.hasAffiliateParams).toBe(true);
  });

  it('detects URL shorteners', () => {
    const signals = extractDomainSignals('Check https://bit.ly/abc123');
    expect(signals).toHaveLength(1);
    expect(signals[0]!.isShortener).toBe(true);
  });

  it('detects obfuscated domains', () => {
    const signals = extractDomainSignals('Visit example[dot]com');
    expect(signals.length).toBeGreaterThanOrEqual(1);
    expect(signals.some((s) => s.isObfuscated)).toBe(true);
  });

  it('detects word-dot obfuscated domains as domains', () => {
    const signals = extractDomainSignals('Visit demo-campaign dot example for the guide');
    expect(signals).toHaveLength(1);
    expect(signals[0]!.normalized).toBe('demo-campaign.example');
    expect(signals[0]!.isObfuscated).toBe(true);
  });

  it('keeps the specific hyphenated playtest domain over a suffix fragment', () => {
    const signals = extractDomainSignals(
      'Read demo-campaign.example and this demo campaign dot example page'
    );
    expect(signals.map((signal) => signal.normalized)).toEqual(['demo-campaign.example']);
  });

  it('returns normalized domain', () => {
    const signals = extractDomainSignals('Visit https://www.example.com/path');
    expect(signals).toHaveLength(1);
    expect(signals[0]!.normalized).toBe('example.com');
  });

  it('handles text with no URLs', () => {
    expect(extractDomainSignals('Just plain text')).toEqual([]);
  });

  it('detects utm_source as affiliate param', () => {
    const signals = extractDomainSignals('https://shop.com/product?utm_source=reddit');
    expect(signals).toHaveLength(1);
    expect(signals[0]!.hasAffiliateParams).toBe(true);
  });

  it('does not flag normal URLs', () => {
    const signals = extractDomainSignals('Check out https://example.com');
    expect(signals).toHaveLength(1);
    expect(signals[0]!.hasAffiliateParams).toBe(false);
    expect(signals[0]!.isShortener).toBe(false);
    expect(signals[0]!.isObfuscated).toBe(false);
  });
});
