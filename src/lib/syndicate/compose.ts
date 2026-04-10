/**
 * Compose the text body for an SNS syndication post.
 *
 * Format: `<title>\n<url>`
 *
 * Truncates the title if the combined string would exceed maxLength.
 * URL is never truncated — better a link-only post than a broken link.
 */

const ELLIPSIS = '…';

export function composeMessage(title: string, url: string, maxLength: number): string {
  const urlBlock = `\n${url}`;
  const headroom = maxLength - urlBlock.length;
  if (headroom <= 0) return url; // edge case: URL alone is too long

  const truncatedTitle = title.length > headroom ? title.slice(0, headroom - 1) + ELLIPSIS : title;
  return `${truncatedTitle}${urlBlock}`;
}
