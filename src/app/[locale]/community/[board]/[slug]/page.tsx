import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ShareButtons } from '@/components/post/ShareButtons';
import { CommentThread } from '@/components/comments/CommentThread';
import { estimateReadingMinutes } from '@/lib/reading-time';
import { getBoardBySlug, getPublicPostByBoardSlug, type UserRole } from '@/lib/posts/queries';
import { renderTipTapHtml, isTipTapEmpty } from '@/lib/tiptap/render';
import { isSupabaseConfigured } from '@/lib/supabase/server';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const ROLE_BADGE: Record<UserRole, string> = {
  admin: '👑',
  operator: '🏅',
  verified: '✅',
  member: '',
};

type Locale = 'ja' | 'ko';
type Params = { locale: string; board: string; slug: string };

function pickLocaleString(a: string | null | undefined, b: string | null | undefined): string {
  return (a ?? b ?? '').trim();
}

function formatDate(iso: string | null, locale: Locale): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, board: boardSlug, slug } = await params;
  if (!isSupabaseConfigured()) return {};
  const post = await getPublicPostByBoardSlug(boardSlug, slug).catch(() => null);
  if (!post) return {};
  const loc = locale as Locale;
  const title =
    loc === 'ja'
      ? pickLocaleString(post.title_ja, post.title_ko)
      : pickLocaleString(post.title_ko, post.title_ja);
  return {
    title,
    openGraph: {
      type: 'article',
      title,
      publishedTime: post.published_at ?? undefined,
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : undefined,
    },
  };
}

/**
 * Community post detail page. Same structure as `/[pillar]/[slug]` but
 * lives under `/community/[board]` and shows the board name in the
 * breadcrumb instead of the pillar name. Trust badges, bilingual
 * fallback, reading time, share buttons, and comments are all inherited
 * from the pillar detail page pattern.
 */
export default async function CommunityPostDetailPage({ params }: { params: Promise<Params> }) {
  const { locale, board: boardSlug, slug } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) notFound();

  const boardRow = await getBoardBySlug(boardSlug).catch(() => null);
  if (!boardRow) notFound();

  const post = await getPublicPostByBoardSlug(boardSlug, slug).catch((err) => {
    console.error('[CommunityPostDetailPage] query failed', { boardSlug, slug, err });
    return null;
  });
  if (!post) notFound();

  const t = await getTranslations('Article');
  const loc = locale as Locale;

  const boardName = loc === 'ja' ? boardRow.name_ja : boardRow.name_ko;
  const title =
    loc === 'ja'
      ? pickLocaleString(post.title_ja, post.title_ko)
      : pickLocaleString(post.title_ko, post.title_ja);
  const authorBadge = ROLE_BADGE[post.author.role] ?? '';

  const primaryBody = loc === 'ja' ? post.body_ja : post.body_ko;
  const fallbackBody = loc === 'ja' ? post.body_ko : post.body_ja;
  const body = !isTipTapEmpty(primaryBody) ? primaryBody : fallbackBody;
  const usedFallback = isTipTapEmpty(primaryBody) && !isTipTapEmpty(fallbackBody);
  const readingMinutes = estimateReadingMinutes(body);
  const html = renderTipTapHtml(body);

  const coverUrl = post.cover_image_url ?? undefined;
  const publishedAtIso = post.published_at ?? post.created_at;
  const canonicalPath = `/community/${boardSlug}/${encodeURIComponent(post.slug)}`;
  const canonicalUrl =
    loc === 'ja' ? `${SITE_URL}${canonicalPath}` : `${SITE_URL}/${loc}${canonicalPath}`;

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-16">
      <div className="mb-6">
        <Link
          href={`/community/${boardSlug}`}
          className="inline-flex items-center text-xs tracking-wide text-zinc-500 uppercase hover:text-[var(--accent)]"
        >
          ← {boardName}
        </Link>
      </div>

      <header className="mb-8 border-b border-[var(--border)] pb-6">
        <p className="font-hand mb-2 text-sm tracking-wide text-[var(--accent)]">{boardName}</p>
        <h1 className="mb-4 text-3xl leading-tight font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
          <span>
            {authorBadge ? `${authorBadge} ` : ''}
            {post.author.nickname}
          </span>
          <time dateTime={publishedAtIso}>{formatDate(publishedAtIso, loc)}</time>
          {readingMinutes > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{t('readingTime', { minutes: readingMinutes })}</span>
            </>
          ) : null}
        </div>
      </header>

      {coverUrl ? (
        <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden rounded-md">
          <Image
            src={coverUrl}
            alt={title}
            fill
            sizes="(min-width: 768px) 720px, 100vw"
            className="object-cover"
            priority
          />
        </div>
      ) : null}

      {usedFallback ? (
        <div className="hand-box mb-6 rounded-md bg-[var(--accent-soft)] p-4 text-sm text-zinc-700 dark:text-zinc-300">
          {t('fallbackBanner')}
        </div>
      ) : null}

      {html ? (
        <div
          className="prose prose-zinc dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-sm text-zinc-500">—</p>
      )}

      <ShareButtons url={canonicalUrl} title={title} />

      <CommentThread targetType="post" targetId={post.id} revalidatePathHint={canonicalPath} />
    </article>
  );
}
