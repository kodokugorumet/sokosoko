/**
 * Slug generation for post URLs.
 *
 * Priority:
 *  1. Normalise the source string (JA or KO title) to kebab-case ASCII where
 *     possible, keeping CJK characters as-is when transliteration isn't
 *     feasible — Vercel and Next.js both support CJK in URL paths, and
 *     SEO-wise a Japanese URL reads better than `post-a8f3c9`.
 *  2. If the source has no usable characters at all, fall back to a short
 *     random suffix so uniqueness is still guaranteed.
 *
 * Uniqueness inside a board is enforced at the DB level via the
 * `(board_slug, slug)` unique index; the caller is expected to catch
 * Postgres error code 23505 and retry with a numeric suffix.
 */

const MAX_LENGTH = 60;

export function slugify(source: string): string {
  const trimmed = source.trim().toLowerCase();
  if (!trimmed) return randomSuffix();

  // Strip punctuation and collapse whitespace. Keeps letters (any script),
  // numbers, and spaces/hyphens; everything else gone.
  const cleaned = trimmed
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const truncated = cleaned.slice(0, MAX_LENGTH).replace(/-+$/, '');
  return truncated || randomSuffix();
}

/**
 * Append a numeric suffix for retry after a unique-violation. Format:
 * `<base>-2`, `<base>-3`, ... without re-running slugify (the base is
 * already clean).
 */
export function appendSuffix(base: string, n: number): string {
  const suffix = `-${n}`;
  const room = MAX_LENGTH - suffix.length;
  return `${base.slice(0, room).replace(/-+$/, '')}${suffix}`;
}

function randomSuffix(): string {
  // 6 hex chars is plenty for a fallback when the title is all punctuation.
  return `post-${Math.random().toString(16).slice(2, 8)}`;
}
