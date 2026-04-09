/**
 * Reading time estimator.
 *
 * CJK text is counted by character, Latin text by whitespace-separated
 * word. The rates below are the conservative midpoints from published
 * legibility studies (JP ~500 chars/min, KO ~500 chars/min, EN ~230 wpm).
 * A single combined rate keeps the output stable when a post mixes
 * scripts.
 *
 * Accepts two input shapes so the same function works across the old
 * Sanity Portable Text era and the current TipTap JSON era:
 *   - Portable Text block arrays (legacy; being removed in Phase 2-F)
 *   - TipTap `JSONContent` documents, recursively walked for text nodes
 */

const CJK_CHARS_PER_MINUTE = 500;
const LATIN_WORDS_PER_MINUTE = 230;

// Unicode ranges for CJK ideographs, hiragana, katakana, hangul syllables.
const CJK_REGEX = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

type PortableTextBlock = {
  _type?: string;
  children?: Array<{ _type?: string; text?: string }>;
};

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
  // TipTap document — has `type: 'doc'` at the root with a `content` array.
  if (
    input &&
    typeof input === 'object' &&
    !Array.isArray(input) &&
    (input as TipTapNode).type === 'doc'
  ) {
    return extractFromTipTap(input).trim();
  }
  // Portable Text — a plain array of block objects. Kept for the duration
  // of the Sanity → Supabase migration; can be deleted once no callers
  // pass PT blocks anymore.
  if (Array.isArray(input)) {
    const out: string[] = [];
    for (const raw of input) {
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
  return '';
}

/**
 * Returns the estimated reading time in whole minutes (minimum 1).
 * Accepts Portable Text block arrays OR TipTap JSON documents; unknown
 * shapes resolve to 1 min.
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
