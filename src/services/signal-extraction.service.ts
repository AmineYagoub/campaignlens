import type { ExtractedSignals, ObfuscationFlag } from '../types/campaign-event';
import { extractDomainSignals } from '../utils/url-extraction';
import { createShortExcerpt } from '../utils/excerpt';
import { extractBrandKeys } from './brand-extractor.service';

function detectObfuscation(input: string): ObfuscationFlag[] {
  const flags: ObfuscationFlag[] = [];
  const lower = input.toLowerCase();

  if (/\bdot\s+com\b/i.test(input) || /\bdot\s+[a-z]{2,}\b/i.test(input)) {
    flags.push('DOT_WORD');
  }

  if (/\[dot\]/i.test(input)) {
    flags.push('BRACKET_DOT');
  }

  if (/\bhxxp/i.test(input)) {
    flags.push('HXXP');
  }

  // Spaced domain: "example dot com" or "shop example dot com"
  if (/\b[\w-]+\s+dot\s+[\w]+(?:\s|$)/i.test(input)) {
    flags.push('SPACED_DOMAIN');
  }

  if (/google\.com\/search|search\?.*q=|bing\.com\/search|duckduckgo\.com/i.test(lower)) {
    flags.push('SEARCH_INSTRUCTION');
  }

  if (/[?&](?:ref|aff|affiliate|referral|tag|utm_source|partner|clickid|subid|aff_id)=/i.test(input)) {
    flags.push('AFFILIATE_PARAM');
  }

  if (/\b(?:bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly|rebrand\.ly|cutt\.ly|short\.io|rb\.gy|smarturl)\b/i.test(input)) {
    flags.push('URL_SHORTENER');
  }

  return flags;
}

export function extractSignals(originalText: string): ExtractedSignals {
  const domainSignals = extractDomainSignals(originalText);
  const obfuscationFlags = detectObfuscation(originalText);
  const shortExcerpt = createShortExcerpt(originalText);

  const domains = domainSignals.map((d) => d.normalized);
  const brandKeys = extractBrandKeys(originalText, domains);

  return {
    domainSignals,
    brandKeys,
    obfuscationFlags,
    shortExcerpt,
  };
}
