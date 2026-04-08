/**
 * Reading time estimator for Sanity Portable Text blocks.
 *
 * CJK text is counted by character, Latin text by whitespace-separated
 * word. The rates below are the conservative midpoints from published
 * legibility studies (JP ~500 chars/min, KO ~500 chars/min, EN ~230 wpm).
 * A single combined rate keeps the output stable when a post mixes
 * scripts.
 */

const CJK_CHARS_PER_MINUTE = 500;
const LATIN_WORDS_PER_MINUTE = 230;

// Unicode ranges for CJK ideographs, hiragana, katakana, hangul syllables.
const CJK_REGEX = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

type PortableTextBlock = {
  _type?: string;
  children?: Array<{ _type?: string; text?: string }>;
};

function extractPlainText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return '';
  const out: string[] = [];
  for (const raw of blocks) {
    const block = raw as PortableTextBlock;
    if (block?._type === 'block' && Array.isArray(block.children)) {
      for (const child of block.children) {
        if (child?._type === 'span' && typeof child.text === 'string') {
          out.push(child.text);
        }
      }
    }
  }
  return out.join(' ');
}

/**
 * Returns the estimated reading time in whole minutes (minimum 1).
 * Accepts Portable Text block arrays; unknown shapes resolve to 1 min.
 */
export function estimateReadingMinutes(blocks: unknown): number {
  const text = extractPlainText(blocks);
  if (!text.trim()) return 1;

  const cjkMatches = text.match(CJK_REGEX) ?? [];
  const cjkCount = cjkMatches.length;

  // Strip CJK so the Latin word count isn't polluted by ideographs.
  const latinText = text.replace(CJK_REGEX, ' ').trim();
  const latinWords = latinText ? latinText.split(/\s+/).filter(Boolean).length : 0;

  const minutes = cjkCount / CJK_CHARS_PER_MINUTE + latinWords / LATIN_WORDS_PER_MINUTE;
  return Math.max(1, Math.ceil(minutes));
}
