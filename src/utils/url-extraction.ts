import type { DomainSignal } from '../types/campaign-event';

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

const BARE_DOMAIN_RE = /(?:^|\s)([\w][\w-]*\.(?:com|net|org|io|co|ai|dev|app|xyz|me|info|biz|cc|tv|us|uk|ca|de|fr|es|it|nl|se|no|dk|fi|pl|br|au|in|jp|kr|cn|ru|mx|za|ng|ke|eg|sa|ae|il|sg|my|ph|th|vn|id|pk|bd|lk|mm|kh|la|np|bt|mv|tl|tr|gr|cz|sk|hu|ro|bg|hr|si|rs|ba|mk|ge|am|az|kz|uz|tm|kg|tj|mn|ps|lb|jo|iq|kw|bh|qa|om|ye|sy|ir|af)(?:\/\S*)?)(?=\s|$|[.!?;:,])/gi;

const OBFUSCATED_DOMAIN_RE = /[\w-]+\s*(?:\[dot\]|\(dot\))\s*[\w-]+(?:\s*(?:\[dot\]|\(dot\))\s*[\w-]+)*/gi;

const PUBLIC_SUFFIXES = new Set([
  'co.uk', 'com.au', 'com.br', 'com.ca', 'com.cn', 'com.fr', 'com.de',
  'com.in', 'com.jp', 'com.mx', 'com.ng', 'com.pk', 'com.sa', 'com.sg',
  'com.za', 'co.jp', 'co.kr', 'co.in', 'co.za', 'co.nz', 'co.il',
  'co.ke', 'co.ng', 'co.th', 'co.id', 'co.my', 'org.uk', 'org.au',
  'org.ca', 'org.in', 'net.au', 'net.br', 'net.in', 'net.nz', 'net.pk',
  'ac.uk', 'ac.in', 'ac.za', 'edu.au', 'edu.in', 'gov.uk', 'gov.in',
  'gov.au', 'gov.za', 'gov.ca', 'ne.jp', 'or.jp',
]);

const SHORTENER_DOMAINS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd',
  'buff.ly', 'rebrand.ly', 'cutt.ly', 'short.io', 'rb.gy',
  'smarturl.it', 'cli.re', 'lnkd.in', 'db.tt', 'qr.ae',
  'j.mp', 'soo.gd', 's2r.co', 'clicky.me', 'bl.ink',
]);

const AFFILIATE_PARAM_RE = /[?&](?:ref|aff|affiliate|referral|tag|utm_source|utm_medium|utm_campaign|partner|clickid|subid|sub_id|aff_id|offer_id|pub_id)=/i;

export function extractUrls(input: string): string[] {
  const urls: string[] = [];

  // Standard URLs first
  const standardMatches = input.match(URL_RE);
  if (standardMatches) {
    urls.push(...standardMatches);
  }

  // Track which domains are already covered by URLs
  const coveredDomains = new Set<string>();
  for (const url of urls) {
    const norm = normalizeDomain(url);
    if (norm) coveredDomains.add(norm);
  }

  // Bare domains — only add if not already covered by a full URL
  const bareMatches = input.matchAll(BARE_DOMAIN_RE);
  for (const match of bareMatches) {
    if (match[1]) {
      const bare = match[1].trim();
      const norm = normalizeDomain(bare);
      if (!coveredDomains.has(norm)) {
        urls.push(bare);
        coveredDomains.add(norm);
      }
    }
  }

  return urls;
}

export function normalizeDomain(urlOrDomain: string): string {
  let domain = urlOrDomain.trim();

  // Strip protocol
  domain = domain.replace(/^https?:\/\//i, '');

  // Strip www
  domain = domain.replace(/^www\./i, '');

  // Strip path, query, fragment
  domain = domain.split(/[/?#]/)[0] ?? '';

  // Lowercase
  domain = domain.toLowerCase();

  // Remove trailing dots
  domain = domain.replace(/\.+$/, '');

  return domain;
}

function applyPublicSuffix(domain: string): string {
  const parts = domain.split('.');
  if (parts.length < 2) return domain;

  // Check for two-part public suffixes
  if (parts.length >= 3) {
    const twoPartSuffix = parts.slice(-2).join('.');
    if (PUBLIC_SUFFIXES.has(twoPartSuffix)) {
      return parts.slice(-3).join('.');
    }
  }

  // Default: last two parts
  return parts.slice(-2).join('.');
}

export function extractDomainSignals(input: string): DomainSignal[] {
  const urls = extractUrls(input);
  const domains: DomainSignal[] = [];

  for (const url of urls) {
    const normalized = normalizeDomain(url);
    if (!normalized || normalized.length < 3) continue;

    const domain = applyPublicSuffix(normalized);
    if (!domain) continue;

    domains.push({
      raw: url,
      normalized: domain,
      hasAffiliateParams: AFFILIATE_PARAM_RE.test(url),
      isShortener: SHORTENER_DOMAINS.has(normalized),
      isObfuscated: OBFUSCATED_DOMAIN_RE.test(url),
    });
  }

  // Also check for obfuscated domains not caught by URL extraction
  const obfuscatedMatches = input.matchAll(OBFUSCATED_DOMAIN_RE);
  for (const match of obfuscatedMatches) {
    const raw = match[0];
    const cleaned = raw
      .replace(/\[dot\]/gi, '.')
      .replace(/\(dot\)/gi, '.')
      .replace(/\bdot\b/gi, '.')
      .replace(/\s+/g, '')
      .toLowerCase();

    const normalized = normalizeDomain(cleaned);
    if (!normalized || normalized.length < 3) continue;

    const domain = applyPublicSuffix(normalized);
    if (domain && !domains.some((d) => d.normalized === domain)) {
      domains.push({
        raw,
        normalized: domain,
        hasAffiliateParams: false,
        isShortener: false,
        isObfuscated: true,
      });
    }
  }

  return domains;
}
