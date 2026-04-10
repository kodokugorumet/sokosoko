/**
 * Reading time estimator for TipTap JSONContent documents.
 *
 * CJK text is counted by character, Latin text by whitespace-separated
 * word. The rates below are the conservative midpoints from published
 * legibility studies (JP ~500 chars/min, KO ~500 chars/min, EN ~230 wpm).
 * A single combined rate keeps the output stable when a post mixes
 * scripts.
 *
 * Returns 0 for empty or missing input so callers can hide the "read in
 * X min" line entirely on stub pages (instead of showing "1 min" for
 * something with no body at all).
 */

const CJK_CHARS_PER_MINUTE = 500;
const LATIN_WORDS_PER_MINUTE = 230;

// Unicode ranges for CJK ideographs, hiragana, katakana, hangul syllables.
const CJK_REGEX = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

type TipTapNode = {
  type?: string;
  text?: string;
  content?: TipTapNode[];
};

function extractFromTipTap(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as TipTapNode;
  let out = '';
  if (typeof n.text === 'string') out += n.text + ' ';
  if (Array.isArray(n.content)) {
    for (const child of n.content) out += extractFromTipTap(child);
  }
  return out;
}

export function extractPlainText(input: unknown): string {
  if (!input || typeof input !== 'object') return '';
  return extractFromTipTap(input).trim();
}

/**
 * Returns the estimated reading time in whole minutes, rounded up.
 * Empty / missing input returns **0** so callers can conditionally
 * render the "X min read" line only when there's actually something to
 * read. Non-empty input always returns at least 1 so we never mislead
 * the reader into thinking a paragraph takes zero minutes.
 */
export function estimateReadingMinutes(body: unknown): number {
  const text = extractPlainText(body);
  if (!text.trim()) return 0;

  const cjkMatches = text.match(CJK_REGEX) ?? [];
  const cjkCount = cjkMatches.length;

  // Strip CJK so the Latin word count isn't polluted by ideographs.
  const latinText = text.replace(CJK_REGEX, ' ').trim();
  const latinWords = latinText ? latinText.split(/\s+/).filter(Boolean).length : 0;

  const minutes = cjkCount / CJK_CHARS_PER_MINUTE + latinWords / LATIN_WORDS_PER_MINUTE;
  return Math.max(1, Math.ceil(minutes));
}
