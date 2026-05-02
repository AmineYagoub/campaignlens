import { describe, it, expect } from 'vitest';
import { normalizeText, normalizeForSimilarity } from './text-normalization';

describe('normalizeText', () => {
  it('lowercases input', () => {
    expect(normalizeText('Hello WORLD')).toBe('hello world');
  });

  it('strips markdown links preserving text and url', () => {
    const result = normalizeText('Check out [Example](https://example.com) for more');
    expect(result).toContain('example');
    expect(result).toContain('https://example.com');
    expect(result).not.toContain('[Example]');
  });

  it('replaces obfuscation patterns', () => {
    expect(normalizeText('visit example dot com today')).toContain('example.com');
    expect(normalizeText('go to example[dot]com')).toContain('example.com');
    expect(normalizeText('try example(dot)com')).toContain('example.com');
    expect(normalizeText('use hxxp://example.com')).toContain('http://example.com');
    expect(normalizeText('use hxxps://example.com')).toContain('https://example.com');
  });

  it('collapses whitespace', () => {
    expect(normalizeText('hello   world   foo')).toBe('hello world foo');
  });

  it('removes punctuation except domain dots', () => {
    const result = normalizeText('Check this out! Really, it works.');
    expect(result).not.toContain('!');
    expect(result).not.toContain(',');
  });

  it('preserves dots in domain-like sequences', () => {
    const result = normalizeText('visit example.com now');
    expect(result).toContain('example.com');
  });

  it('handles empty input', () => {
    expect(normalizeText('')).toBe('');
  });

  it('handles input with only whitespace', () => {
    expect(normalizeText('   ')).toBe('');
  });
});

describe('normalizeForSimilarity', () => {
  it('removes URLs', () => {
    const result = normalizeForSimilarity('Check https://example.com for details');
    expect(result).not.toContain('https://example.com');
    expect(result).toContain('check');
    expect(result).toContain('details');
  });

  it('removes stopwords', () => {
    const result = normalizeForSimilarity('This is a very good product for the price');
    expect(result).not.toContain(' is ');
    expect(result).not.toContain(' a ');
    expect(result).not.toContain(' the ');
    expect(result).not.toContain(' for ');
    expect(result).toContain('good');
    expect(result).toContain('product');
    expect(result).toContain('price');
  });

  it('removes short tokens (length <= 2)', () => {
    const result = normalizeForSimilarity('I am ok with it');
    expect(result).not.toContain(' i');
    expect(result).not.toContain(' am');
  });

  it('returns lowercase tokens separated by spaces', () => {
    const result = normalizeForSimilarity('Best Camera Reviews and deals');
    expect(result).toBe('best camera reviews deals');
  });
});
