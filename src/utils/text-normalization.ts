const OBFUSCATION_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bdot\s+com\b/gi, '.com'],
  [/\[dot\]/gi, '.'],
  [/\(dot\)/gi, '.'],
  [/\bhxxp(s?)\b/gi, 'http$1'],
];

const MARKDOWN_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;
const PROTECTED_TOKEN_PREFIX = 'clprotected';
const PROTECTED_TOKEN_SUFFIX = 'cltoken';
const PROTECTED_TOKEN_RE = /clprotected(\d+)cltoken/g;

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'this', 'that', 'was', 'are',
  'be', 'have', 'has', 'had', 'not', 'they', 'you', 'we', 'he', 'she',
  'i', 'me', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'what',
  'which', 'who', 'when', 'where', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'because', 'as', 'until',
  'while', 'about', 'between', 'through', 'during', 'before', 'after',
  'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
  'then', 'once', 'here', 'there', 'why', 'if', 'also', 'been', 'were',
  'would', 'could', 'should', 'do', 'does', 'did', 'get', 'got', 'really',
  'much', 'many', 'any', 'into', 'can', 'will', 'am', 'being',
]);

export function normalizeText(input: string): string {
  let text = input;

  // Preserve markdown link text and URLs
  text = text.replace(MARKDOWN_LINK_RE, (_, linkText, url) => {
    return ` ${linkText} ${url} `;
  });

  // Replace obfuscation patterns
  for (const [pattern, replacement] of OBFUSCATION_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  // Collapse spaces around dots (from obfuscation replacement)
  text = text.replace(/\s*\.\s*/g, '.');

  // Lowercase
  text = text.toLowerCase();

  // Remove punctuation except:
  // - dots within domains (alphanum dot alphanum)
  // - colons and slashes in URLs (http:// https://)
  // Strategy: extract and protect URLs, then strip punctuation from the rest
  const protectedParts: string[] = [];
  let idx = 0;
  text = text.replace(/https?:\/\/\S+/g, (match) => {
    protectedParts.push(match);
    return `${PROTECTED_TOKEN_PREFIX}${idx++}${PROTECTED_TOKEN_SUFFIX}`;
  });

  // Also protect domain-like sequences (word.word)
  text = text.replace(/\b([\w-]+\.[\w.-]+)\b/g, (match) => {
    protectedParts.push(match);
    return `${PROTECTED_TOKEN_PREFIX}${idx++}${PROTECTED_TOKEN_SUFFIX}`;
  });

  // Remove remaining punctuation
  text = text.replace(/[^\w\s]/g, ' ');

  // Restore protected parts
  text = text.replace(PROTECTED_TOKEN_RE, (_, i) => protectedParts[Number(i)] ?? '');

  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

export function normalizeForSimilarity(input: string): string {
  // First do basic normalization
  let text = normalizeText(input);

  // Remove URLs
  text = text.replace(/https?:\/\/\S+/gi, '');
  text = text.replace(/www\.\S+/gi, '');

  // Remove standalone domain-like tokens
  text = text.replace(/\b[\w-]+\.[a-z]{2,}\b/gi, '');

  // Remove dots (no longer needed for domain context)
  text = text.replace(/\./g, ' ');

  // Split into tokens, filter stopwords and short tokens
  const tokens = text
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));

  return tokens.join(' ');
}
