import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPublicPostById } from '@/lib/posts/queries';
import { renderTipTapHtml, isTipTapEmpty } from '@/lib/tiptap/render';

type Params = { locale: string; id: string };

const ROLE_BADGE: Record<string, string> = {
  admin: '👑',
  operator: '🏅',
  verified: '✅',
  member: '',
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, id } = await params;
  const post = await getPublicPostById(id).catch(() => null);
  if (!post) return { title: 'Not found' };

  const loc = locale as 'ja' | 'ko';
  const title =
    (loc === 'ja' ? post.title_ja : post.title_ko) ?? post.title_ja ?? post.title_ko ?? 'Post';
  const description =
    (loc === 'ja' ? post.excerpt_ja : post.excerpt_ko) ??
    post.excerpt_ja ??
    post.excerpt_ko ??
    undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.published_at ?? undefined,
    },
  };
}

/**
 * Public post detail page at `/p/[id]`. Temporary URL shape until Phase
 * 2-F decides the final structure (likely `/[board]/[slug]`). The id
 * query always works because it's the PK; the slug column is still
 * written, just not yet surfaced in the URL.
 *
 * Bilingual fallback: if the requested locale has no body, fall back to
 * the other locale and show a banner so the reader knows they're seeing
 * a translation that isn't ready yet.
 */
export default async function PublicPostPage({ params }: { params: Promise<Params> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const post = await getPublicPostById(id).catch(() => null);
  if (!post) notFound();

  const t = await getTranslations('PublicPost');
  const loc = locale as 'ja' | 'ko';

  const primaryBody = loc === 'ja' ? post.body_ja : post.body_ko;
  const fallbackBody = loc === 'ja' ? post.body_ko : post.body_ja;
  const body = !isTipTapEmpty(primaryBody) ? primaryBody : fallbackBody;
  const isFallback = isTipTapEmpty(primaryBody) && !isTipTapEmpty(fallbackBody);

  const title =
    (loc === 'ja' ? post.title_ja : post.title_ko) ??
    post.title_ja ??
    post.title_ko ??
    t('untitled');
  const excerpt = loc === 'ja' ? post.excerpt_ja : post.excerpt_ko;

  const html = renderTipTapHtml(body);

  const publishedAt = post.published_at
    ? new Date(post.published_at).toLocaleDateString(loc === 'ja' ? 'ja-JP' : 'ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-16">
      <header className="mb-8">
        <h1 className="font-hand mb-4 text-3xl tracking-wide text-[var(--ink)] sm:text-5xl">
          {title}
        </h1>
        {excerpt ? (
          <p className="mb-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            {excerpt}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          <span>
            {ROLE_BADGE[post.author.role] ? `${ROLE_BADGE[post.author.role]} ` : ''}
            {post.author.nickname}
          </span>
          {publishedAt ? <span>· {publishedAt}</span> : null}
        </div>
      </header>

      {isFallback ? (
        <div className="hand-box mb-6 rounded-md bg-[var(--accent-soft)] p-4 text-sm">
          {t('fallbackBanner')}
        </div>
      ) : null}

      {html ? (
        <div
          className="prose prose-zinc dark:prose-invert max-w-none"
          // TipTap output is sanitised by the editor schema (only the
          // nodes/marks we registered in EXTENSIONS can appear). No user
          // arbitrary HTML makes it into this string.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-sm text-zinc-500">{t('emptyBody')}</p>
      )}
    </article>
  );
}
