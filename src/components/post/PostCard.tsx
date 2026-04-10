import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { PublicPostCardRow, UserRole } from '@/lib/posts/queries';

/**
 * Board-grid post card used by every article list (home, pillar index,
 * search results, related posts). Hands the reader into
 * `/[board]/[slug]` because slug-based URLs are nicer to share and
 * Supabase enforces uniqueness on `(board_slug, slug)` so the route is
 * unambiguous.
 */

const ROLE_BADGE: Record<UserRole, string> = {
  admin: '👑',
  operator: '🏅',
  verified: '✅',
  member: '',
};

type Locale = 'ja' | 'ko';

function pickLocaleString(value: string | null, otherValue: string | null): string {
  return (value ?? otherValue ?? '').trim();
}

function formatDate(iso: string | null, locale: Locale): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function PostCard({
  post,
  locale,
  hrefPrefix,
}: {
  post: PublicPostCardRow;
  locale: Locale;
  /** Override the URL prefix. Default is `/${board_slug}`. Community
   *  boards pass `/community/${board_slug}` so the card links into the
   *  right route tree without touching the DB's board_slug value. */
  hrefPrefix?: string;
}) {
  const title =
    locale === 'ja'
      ? pickLocaleString(post.title_ja, post.title_ko)
      : pickLocaleString(post.title_ko, post.title_ja);
  const excerpt =
    locale === 'ja'
      ? pickLocaleString(post.excerpt_ja, post.excerpt_ko)
      : pickLocaleString(post.excerpt_ko, post.excerpt_ja);
  const badge = ROLE_BADGE[post.author.role];
  const prefix = hrefPrefix ?? `/${post.board_slug}`;
  const href = `${prefix}/${encodeURIComponent(post.slug)}`;

  return (
    <Link
      href={href}
      className="hand-box group flex flex-col overflow-hidden rounded-md transition-colors hover:bg-[var(--accent-soft)]"
    >
      {post.cover_image_url ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <Image
            src={post.cover_image_url}
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      ) : (
        // No cover — soft pastel block keeps the grid even.
        <div
          aria-hidden="true"
          className="flex aspect-[16/10] w-full items-center justify-center bg-[var(--accent-soft)] text-4xl"
        >
          {badge || '✏️'}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="line-clamp-2 text-base font-medium tracking-tight text-[var(--ink)]">
          {title}
        </h3>
        {excerpt ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {excerpt}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between pt-3 text-xs text-zinc-500">
          <span>
            {badge ? `${badge} ` : ''}
            {post.author.nickname}
          </span>
          {post.published_at ? (
            <time dateTime={post.published_at}>{formatDate(post.published_at, locale)}</time>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
