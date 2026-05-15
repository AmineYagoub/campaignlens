import { fnv1a64 } from '../utils/hashing';
import { normalizeForSimilarity } from '../utils/text-normalization';

function createShingles(tokens: string[], size: number): string[][] {
  if (tokens.length < size) return [tokens];
  const shingles: string[][] = [];
  for (let i = 0; i <= tokens.length - size; i++) {
    shingles.push(tokens.slice(i, i + size));
  }
  return shingles;
}

export function simhash64(text: string): bigint {
  const normalized = normalizeForSimilarity(text);
  if (!normalized) return 0n;

  const tokens = normalized.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return 0n;

  const shingles = createShingles(tokens, 3);
  if (shingles.length === 0) return 0n;

  // 64-bit vector for bit weight accumulation
  const bits = new Int32Array(64);

  for (const shingle of shingles) {
    const key = shingle.join(' ');
    const hash = fnv1a64(key);

    // Add or subtract each bit position
    for (let i = 0; i < 64; i++) {
      if ((hash >> BigInt(i)) & 1n) {
        bits[i]!++;
      } else {
        bits[i]!--;
      }
    }
  }

  // Build fingerprint: bit = 1 if positive, 0 otherwise
  let fingerprint = 0n;
  for (let i = 0; i < 64; i++) {
    if (bits[i]! > 0) {
      fingerprint |= 1n << BigInt(i);
    }
  }

  return fingerprint;
}

export function hammingDistance64(a: bigint, b: bigint): number {
  let xor = a ^ b;
  let count = 0;
  while (xor) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}

export function simhashPrefixes(hash: bigint): string[] {
  const hex = hash.toString(16).padStart(16, '0');
  return [
    hex.slice(0, 4),
    hex.slice(4, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
  ];
}
