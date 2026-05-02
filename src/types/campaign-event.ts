export type ObfuscationFlag =
  | 'DOT_WORD'
  | 'BRACKET_DOT'
  | 'HXXP'
  | 'SPACED_DOMAIN'
  | 'SEARCH_INSTRUCTION'
  | 'AFFILIATE_PARAM'
  | 'URL_SHORTENER';

export type DomainSignal = {
  raw: string;
  normalized: string;
  hasAffiliateParams: boolean;
  isShortener: boolean;
  isObfuscated: boolean;
};

export type ExtractedSignals = {
  domainSignals: DomainSignal[];
  brandKeys: string[];
  obfuscationFlags: ObfuscationFlag[];
  shortExcerpt: string;
};
