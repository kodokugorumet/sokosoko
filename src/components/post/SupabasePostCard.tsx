import { Link } from '@/i18n/navigation';
import type { PublicPostCardRow, UserRole } from '@/lib/posts/queries';

/**
 * Board-grid post card for the Supabase era. Replaces the old
 * `PostCard` that read from Sanity; named `SupabasePostCard` during the
 * Phase 2-F transition so the two could coexist, but once the Sanity
 * code is gone this will be renamed back to plain `PostCard` in a
 * follow-up PR.
 *
 * Hands the reader into `/[board]/[slug]` (not `/p/[id]`) because
 * slug-based URLs are nicer to share and Supabase enforces uniqueness
 * on `(board_slug, slug)` so the route is unambiguous.
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

export function SupabasePostCard({ post, locale }: { post: PublicPostCardRow; locale: Locale }) {
  const title =
    locale === 'ja'
      ? pickLocaleString(post.title_ja, post.title_ko)
      : pickLocaleString(post.title_ko, post.title_ja);
  const excerpt =
    locale === 'ja'
      ? pickLocaleString(post.excerpt_ja, post.excerpt_ko)
      : pickLocaleString(post.excerpt_ko, post.excerpt_ja);
  const badge = ROLE_BADGE[post.author.role];
  const href = `/${post.board_slug}/${encodeURIComponent(post.slug)}`;

  return (
    <Link
      href={href}
      className="hand-box group flex flex-col overflow-hidden rounded-md transition-colors hover:bg-[var(--accent-soft)]"
    >
      {post.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URLs aren't whitelisted for next/image yet; Phase 2-G will wire them up properly.
        <img
          src={post.cover_image_url}
          alt=""
          className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
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
