import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PostCard } from '@/components/post/PostCard';
import { ShareButtons } from '@/components/post/ShareButtons';
import { CommentThread } from '@/components/comments/CommentThread';
import { estimateReadingMinutes } from '@/lib/reading-time';
import {
  getPublicPostByBoardSlug,
  listPublishedPostsByBoard,
  type UserRole,
  type PublicPostCardRow,
} from '@/lib/posts/queries';
import { renderTipTapHtml, isTipTapEmpty } from '@/lib/tiptap/render';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

// Pillars supported at this route. Adding a new article board here
// plus a row in the Supabase `boards` table is enough — no other
// wiring required.
const PILLARS = ['life', 'study', 'trip'] as const;
type PillarSlug = (typeof PILLARS)[number];

function isPillar(value: string): value is PillarSlug {
  return (PILLARS as readonly string[]).includes(value);
}

const ROLE_BADGE: Record<UserRole, string> = {
  admin: '👑',
  operator: '🏅',
  verified: '✅',
  member: '',
};

type Locale = 'ja' | 'ko';
type Params = { locale: string; pillar: string; slug: string };

function pickLocaleString(
  value: string | null | undefined,
  otherValue: string | null | undefined,
): string {
  return (value ?? otherValue ?? '').trim();
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
  const { locale, pillar, slug } = await params;
  if (!isPillar(pillar)) return {};
  const post = await getPublicPostByBoardSlug(pillar, slug).catch(() => null);
  if (!post) return {};
  const loc = locale as Locale;

  const title =
    loc === 'ja'
      ? pickLocaleString(post.title_ja, post.title_ko)
      : pickLocaleString(post.title_ko, post.title_ja);
  const description =
    loc === 'ja'
      ? pickLocaleString(post.excerpt_ja, post.excerpt_ko)
      : pickLocaleString(post.excerpt_ko, post.excerpt_ja);

  const canonicalPath = `/${pillar}/${encodeURIComponent(post.slug)}`;
  const canonicalUrl =
    loc === 'ja' ? `${SITE_URL}${canonicalPath}` : `${SITE_URL}/${loc}${canonicalPath}`;

  const ogImage = post.cover_image_url ?? undefined;

  return {
    title,
    description: description || undefined,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ja: `${SITE_URL}${canonicalPath}`,
        ko: `${SITE_URL}/ko${canonicalPath}`,
      },
    },
    openGraph: {
      type: 'article',
      title,
      description: description || undefined,
      url: canonicalUrl,
      locale: loc === 'ja' ? 'ja_JP' : 'ko_KR',
      publishedTime: post.published_at ?? undefined,
      authors: [post.author.nickname],
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description: description || undefined,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { locale, pillar, slug } = await params;
  if (!isPillar(pillar)) notFound();
  setRequestLocale(locale);

  const post = await getPublicPostByBoardSlug(pillar, slug).catch((err) => {
    console.error('[ArticlePage] getPublicPostByBoardSlug failed', { pillar, slug, err });
    return null;
  });
  if (!post) notFound();

  // Related posts: newest from the same board minus the current one.
  // Small list, cached implicitly via the board's published_at index.
  const related = (await listPublishedPostsByBoard(pillar).catch(() => []))
    .filter((p) => p.id !== post.id)
    .slice(0, 3) satisfies PublicPostCardRow[];

  const t = await getTranslations('Article');
  const tPillar = await getTranslations('Pillar');
  const tNav = await getTranslations('Nav');
  const loc = locale as Locale;

  const title =
    loc === 'ja'
      ? pickLocaleString(post.title_ja, post.title_ko)
      : pickLocaleString(post.title_ko, post.title_ja);
  const description =
    loc === 'ja'
      ? pickLocaleString(post.excerpt_ja, post.excerpt_ko)
      : pickLocaleString(post.excerpt_ko, post.excerpt_ja);
  const authorName = post.author.nickname;
  const authorBadge = ROLE_BADGE[post.author.role] ?? '';

  // Locale body fallback: prefer current locale, fall back to the other if
  // the translation is missing. Banner only shows when we actually fell back.
  const primaryBody = loc === 'ja' ? post.body_ja : post.body_ko;
  const fallbackBody = loc === 'ja' ? post.body_ko : post.body_ja;
  const body = !isTipTapEmpty(primaryBody) ? primaryBody : fallbackBody;
  const usedFallback = isTipTapEmpty(primaryBody) && !isTipTapEmpty(fallbackBody);

  const readingMinutes = estimateReadingMinutes(body);
  const html = renderTipTapHtml(body);

  const canonicalPath = `/${pillar}/${encodeURIComponent(post.slug)}`;
  const canonicalUrl =
    loc === 'ja' ? `${SITE_URL}${canonicalPath}` : `${SITE_URL}/${loc}${canonicalPath}`;
  const coverUrl = post.cover_image_url ?? undefined;
  const publishedAtIso = post.published_at ?? post.created_at;

  // Schema.org Article — what Search Console actually validates.
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description || undefined,
    image: coverUrl ? [coverUrl] : undefined,
    datePublished: publishedAtIso,
    dateModified: post.updated_at,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    inLanguage: loc === 'ja' ? 'ja-JP' : 'ko-KR',
    articleSection: tPillar(`${pillar}.title`),
  };

  // BreadcrumbList — Home › Pillar › Article
  const pillarUrl = loc === 'ja' ? `${SITE_URL}/${pillar}` : `${SITE_URL}/${loc}/${pillar}`;
  const homeUrl = loc === 'ja' ? `${SITE_URL}/` : `${SITE_URL}/${loc}`;
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: tNav('home'), item: homeUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: tPillar(`${pillar}.title`),
        item: pillarUrl,
      },
      { '@type': 'ListItem', position: 3, name: title, item: canonicalUrl },
    ],
  };

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="mb-6">
        <Link
          href={`/${pillar}`}
          className="inline-flex items-center text-xs tracking-wide text-zinc-500 uppercase hover:text-[var(--accent)]"
        >
          {t('backToPillar', { pillar: tPillar(`${pillar}.title`) })}
        </Link>
      </div>

      <header className="mb-8 border-b border-[var(--border)] pb-6">
        <p className="font-hand mb-2 text-sm tracking-wide text-[var(--accent)]">
          {tPillar(`${pillar}.title`)}
        </p>
        <h1 className="mb-4 text-3xl leading-tight font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
          <Link
            href={`/user/${encodeURIComponent(authorName)}`}
            className="hover:text-[var(--accent)] hover:underline"
          >
            {authorBadge ? `${authorBadge} ` : ''}
            {authorName}
          </Link>
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

      {related.length > 0 ? (
        <section className="mt-16 border-t border-[var(--border)] pt-10">
          <h2 className="font-hand mb-6 text-2xl tracking-wide text-[var(--ink)]">
            {t('relatedHeading')}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <PostCard key={r.id} post={r} locale={loc} />
            ))}
          </div>
        </section>
      ) : null}

      <CommentThread
        targetType="post"
        targetId={post.id}
        revalidatePathHint={`/${pillar}/${encodeURIComponent(post.slug)}`}
      />
    </article>
  );
}
