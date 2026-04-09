import type { SyndicationPost } from './types';

/**
 * Shared text composition for all adapters.
 *
 * Most platforms have a tight character budget (Bluesky: 300, X free
 * tier: 280) so we build a single short message that prefers JA when
 * available and falls back to KO. The article URL is always appended
 * — link previews on Bluesky/X are unfurled by the platform itself.
 */

const ELLIPSIS = '…';

function pickLocaleString(value: { ja?: string; ko?: string } | undefined): string {
  if (!value) return '';
  return (value.ja ?? value.ko ?? '').trim();
}

/**
 * Builds the body of a syndicated post. Honours `maxLength` so each
 * adapter can pass its own platform limit; the URL is reserved at the
 * end and never truncated.
 *
 * Returns:
 *   "<title>\n<truncated excerpt>\n<url>"
 *
 * If only the title fits, the excerpt is dropped entirely. If even the
 * title would overflow, it is truncated with an ellipsis.
 */
export function composeMessage(post: SyndicationPost, maxLength: number): string {
  const title = pickLocaleString(post.title);
  const excerpt = pickLocaleString(post.excerpt);
  const url = post.url;

  // Reserve room for the URL (+ surrounding newlines). If even that
  // doesn't fit, return just the URL — better than nothing.
  const urlBlock = `\n${url}`;
  const headroom = maxLength - urlBlock.length;
  if (headroom <= 0) return url;

  // Try the full layout first.
  const titleLine = title.length > headroom ? title.slice(0, headroom - 1) + ELLIPSIS : title;
  let body = titleLine;

  if (excerpt) {
    const remainingForExcerpt = headroom - body.length - 1; // -1 for newline
    if (remainingForExcerpt > 8) {
      const trimmedExcerpt =
        excerpt.length > remainingForExcerpt
          ? excerpt.slice(0, remainingForExcerpt - 1) + ELLIPSIS
          : excerpt;
      body = `${body}\n${trimmedExcerpt}`;
    }
  }

  return `${body}${urlBlock}`;
}
