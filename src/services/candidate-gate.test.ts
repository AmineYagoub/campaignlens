import { describe, it, expect } from 'vitest';
import { isCandidate } from './candidate-gate.service';

describe('isCandidate', () => {
  it('flags interaction with domain', () => {
    const result = isCandidate({
      contentId: 't1_abc',
      ts: Date.now(),
      kind: 'post',
      hourBucket: '2024-01-01T12',
      hasDomain: true,
      hasBrand: false,
      hasObfuscation: false,
    });
    expect(result.isCandidate).toBe(true);
    expect(result.reasons).toContain('contains_domain');
  });

  it('flags interaction with brand', () => {
    const result = isCandidate({
      contentId: 't1_abc',
      ts: Date.now(),
      kind: 'post',
      hourBucket: '2024-01-01T12',
      hasDomain: false,
      hasBrand: true,
      hasObfuscation: false,
    });
    expect(result.isCandidate).toBe(true);
    expect(result.reasons).toContain('contains_brand');
  });

  it('flags interaction with obfuscation', () => {
    const result = isCandidate({
      contentId: 't1_abc',
      ts: Date.now(),
      kind: 'comment',
      hourBucket: '2024-01-01T12',
      hasDomain: false,
      hasBrand: false,
      hasObfuscation: true,
    });
    expect(result.isCandidate).toBe(true);
    expect(result.reasons).toContain('obfuscated');
  });

  it('does not flag interaction with only simhash', () => {
    const result = isCandidate({
      contentId: 't1_abc',
      ts: Date.now(),
      kind: 'post',
      hourBucket: '2024-01-01T12',
      hasDomain: false,
      hasBrand: false,
      hasObfuscation: false,
      simhash64: 'abcdef1234567890',
    });
    expect(result.isCandidate).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it('does not flag plain text', () => {
    const result = isCandidate({
      contentId: 't1_abc',
      ts: Date.now(),
      kind: 'comment',
      hourBucket: '2024-01-01T12',
      hasDomain: false,
      hasBrand: false,
      hasObfuscation: false,
    });
    expect(result.isCandidate).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it('collects multiple reasons', () => {
    const result = isCandidate({
      contentId: 't1_abc',
      ts: Date.now(),
      kind: 'post',
      hourBucket: '2024-01-01T12',
      hasDomain: true,
      hasBrand: true,
      hasObfuscation: true,
    });
    expect(result.isCandidate).toBe(true);
    expect(result.reasons.length).toBe(3);
  });
});
