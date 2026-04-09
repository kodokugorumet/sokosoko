import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { PortableTextRenderer } from '@/components/post/PortableTextRenderer';
import { PostCard } from '@/components/post/PostCard';
import { ShareButtons } from '@/components/post/ShareButtons';
import { estimateReadingMinutes } from '@/lib/reading-time';
import { urlFor } from '../../../../../sanity/lib/image';
import { sanityFetch } from '../../../../../sanity/lib/fetch';
import {
  ALL_POST_SLUGS_QUERY,
  POST_BY_SLUG_QUERY,
  RELATED_POSTS_QUERY,
  type PostCard as PostCardType,
  type PostDetail,
  type PostSlug,
} from '../../../../../sanity/lib/queries';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const revalidate = 3600;

const PILLARS = ['life', 'study', 'trip'] as const;
type PillarSlug = (typeof PILLARS)[number];

function isPillar(value: string): value is PillarSlug {
  return (PILLARS as readonly string[]).includes(value);
}

const TIER_BADGE: Record<string, string> = {
  crown: '👑',
  apple: '🍎',
  contributor: '✏️',
};

type Locale = 'ja' | 'ko';
type Params = { locale: string; pillar: string; slug: string };

function pickLocaleString(value: { ja?: string; ko?: string } | undefined, locale: Locale) {
  if (!value) return '';
  return value[locale] ?? value[locale === 'ja' ? 'ko' : 'ja'] ?? '';
}

function formatDate(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generateStaticParams() {
  const slugs = await sanityFetch<PostSlug[]>({
    query: ALL_POST_SLUGS_QUERY,
    revalidate: 0,
    fallback: [],
  });
  // Cross every published post with each supported locale.
  return slugs.flatMap((entry) =>
    routing.locales.map((locale) => ({
      locale,
      pillar: entry.pillar,
      slug: entry.slug,
    })),
  );
}

async function fetchPost(slug: string) {
  return sanityFetch<PostDetail | null>({
    query: POST_BY_SLUG_QUERY,
    params: { slug },
    tags: ['post', `post:${slug}`],
    fallback: null,
  });
}

async function fetchRelated(pillar: PillarSlug, slug: string) {
  return sanityFetch<PostCardType[]>({
    query: RELATED_POSTS_QUERY,
    params: { pillar, slug },
    tags: ['post', `pillar:${pillar}`],
    fallback: [],
  });
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, pillar, slug } = await params;
  if (!isPillar(pillar)) return {};
  const post = await fetchPost(slug);
  if (!post || post.category.pillar !== pillar) return {};
  const loc = locale as Locale;
  const title = pickLocaleString(post.title, loc);
  const description = pickLocaleString(post.excerpt, loc);
  const canonicalPath = `/${pillar}/${slug}`;
  const canonicalUrl =
    loc === 'ja' ? `${SITE_URL}${canonicalPath}` : `${SITE_URL}/${loc}${canonicalPath}`;
  // Use the cover as OG/Twitter image when present; otherwise fall through
  // to the site-wide /opengraph-image. Twitter prefers `summary_large_image`
  // when the asset is 16:9 (we already crop to 1200x630).
  const ogImage = post.coverImage
    ? urlFor(post.coverImage).width(1200).height(630).fit('crop').url()
    : undefined;
  return {
    title,
    description,
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
      description,
      url: canonicalUrl,
      locale: loc === 'ja' ? 'ja_JP' : 'ko_KR',
      publishedTime: post.publishedAt,
      authors: [pickLocaleString(post.author.name, loc)],
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { locale, pillar, slug } = await params;
  if (!isPillar(pillar)) notFound();
  setRequestLocale(locale);

  const [post, related] = await Promise.all([
    fetchPost(slug),
    fetchRelated(pillar as PillarSlug, slug),
  ]);
  if (!post || post.category.pillar !== pillar) notFound();

  const t = await getTranslations('Article');
  const tPillar = await getTranslations('Pillar');
  const tNav = await getTranslations('Nav');
  const loc = locale as Locale;

  const title = pickLocaleString(post.title, loc);
  const authorName = pickLocaleString(post.author.name, loc);
  const categoryTitle = pickLocaleString(post.category.title, loc);
  const tierBadge = TIER_BADGE[post.author.tier] ?? '';

  // Locale body fallback: prefer current locale, fall back to the other if
  // the translation is missing. Banner only shows when we actually fell back.
  const primaryBody = loc === 'ja' ? post.bodyJa : post.bodyKo;
  const fallbackBody = loc === 'ja' ? post.bodyKo : post.bodyJa;
  const usedFallback = (!primaryBody || primaryBody.length === 0) && !!fallbackBody?.length;
  const body = usedFallback ? fallbackBody : primaryBody;

  // Derived from the rendered body so the number reflects the locale the
  // reader actually sees (fallback included). Floor of 1 minute.
  const readingMinutes = estimateReadingMinutes(body);

  // Canonical article URL — default locale lives at `/`, others at `/{locale}`.
  const canonicalPath = `/${pillar}/${slug}`;
  const canonicalUrl =
    loc === 'ja' ? `${SITE_URL}${canonicalPath}` : `${SITE_URL}/${loc}${canonicalPath}`;
  const description = pickLocaleString(post.excerpt, loc);
  const coverUrl = post.coverImage
    ? urlFor(post.coverImage).width(1600).height(900).fit('crop').url()
    : undefined;

  // Schema.org Article — gives Google a precise understanding of the page.
  // Image + author + dates are the fields Search Console actually validates.
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description || undefined,
    image: coverUrl ? [coverUrl] : undefined,
    datePublished: post.publishedAt,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    inLanguage: loc === 'ja' ? 'ja-JP' : 'ko-KR',
    articleSection: categoryTitle,
  };

  // BreadcrumbList — Home › Pillar › Article. Google uses this to render
  // the breadcrumb trail in search results instead of the raw URL.
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
      {/* Structured data for search engines. Renders as a plain <script>
          in the DOM; React 19 allows this inline without dangerouslySet. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Breadcrumb / category chip */}
      <div className="mb-6">
        <Link
          href={`/${pillar}`}
          className="inline-flex items-center text-xs tracking-wide text-zinc-500 uppercase hover:text-[var(--accent)]"
        >
          {t('backToPillar', { pillar: tPillar(`${pillar}.title`) })}
        </Link>
      </div>

      <header className="mb-8 border-b border-[var(--border)] pb-6">
        <p className="font-hand mb-2 text-sm tracking-wide text-[var(--accent)]">{categoryTitle}</p>
        <h1 className="mb-4 text-3xl leading-tight font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
          <span>
            {tierBadge} {authorName}
          </span>
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, loc)}</time>
          <span aria-hidden="true">·</span>
          <span>{t('readingTime', { minutes: readingMinutes })}</span>
        </div>
      </header>

      {/* Cover image — only when set */}
      {post.coverImage ? (
        <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden rounded-md">
          <Image
            src={urlFor(post.coverImage).width(1600).height(900).fit('crop').url()}
            alt={title}
            fill
            sizes="(min-width: 768px) 720px, 100vw"
            className="object-cover"
            priority
          />
        </div>
      ) : null}

      {/* Translation fallback notice */}
      {usedFallback ? (
        <div className="hand-box mb-6 rounded-md bg-[var(--accent-soft)] p-4 text-sm text-zinc-700 dark:text-zinc-300">
          {t('fallbackBanner')}
        </div>
      ) : null}

      {body && body.length > 0 ? (
        <div className="prose-tight">
          <PortableTextRenderer value={body} />
        </div>
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
              <PostCard key={r._id} post={r} locale={loc} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
