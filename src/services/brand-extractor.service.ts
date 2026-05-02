const PUBLIC_SUFFIXES = new Set([
  'co.uk', 'com.au', 'com.br', 'com.ca', 'com.cn', 'com.fr', 'com.de',
  'com.in', 'com.jp', 'com.mx', 'com.ng', 'com.pk', 'com.sa', 'com.sg',
  'com.za', 'co.jp', 'co.kr', 'co.in', 'co.za', 'co.nz', 'co.il',
  'co.ke', 'co.ng', 'co.th', 'co.id', 'co.my', 'org.uk', 'org.au',
  'org.ca', 'org.in', 'net.au', 'net.br', 'net.in', 'net.nz', 'net.pk',
  'ac.uk', 'ac.in', 'ac.za', 'edu.au', 'edu.in', 'gov.uk', 'gov.in',
  'gov.au', 'gov.za', 'gov.ca', 'ne.jp', 'or.jp',
]);

function extractRegistrablePart(domain: string): string {
  const parts = domain.split('.');
  if (parts.length < 2) return domain;

  if (parts.length >= 3) {
    const twoPartSuffix = parts.slice(-2).join('.');
    if (PUBLIC_SUFFIXES.has(twoPartSuffix)) {
      return parts[parts.length - 3] ?? domain;
    }
  }

  return parts[parts.length - 2] ?? parts[0]!;
}

export function extractBrandKeys(originalText: string, domains: string[]): string[] {
  const keys = new Set<string>();

  // Strategy 1: Derive from domains (extract registrable part, not subdomain)
  for (const domain of domains) {
    const name = extractRegistrablePart(domain);
    if (name.length >= 3) {
      keys.add(name.toLowerCase());
    }
  }

  // Strategy 2: Repeated capitalized phrases (2-3 words)
  const capitalizedPhrases = originalText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g) ?? [];
  const phraseCounts = new Map<string, number>();
  for (const phrase of capitalizedPhrases) {
    const lower = phrase.toLowerCase();
    phraseCounts.set(lower, (phraseCounts.get(lower) ?? 0) + 1);
  }
  const commonStarts = new Set(['the', 'this', 'that', 'then', 'they', 'them', 'when', 'what', 'with', 'will']);
  for (const [phrase, count] of phraseCounts) {
    if (count >= 2 && phrase.length >= 3 && !commonStarts.has(phrase.split(' ')[0]!)) {
      keys.add(phrase);
    }
  }

  // Strategy 3: Full domain as brand key
  for (const domain of domains) {
    keys.add(domain.toLowerCase());
  }

  const deduped = [...keys];

  return deduped.slice(0, 20);
}
