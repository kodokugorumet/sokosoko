import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { PortableTextRenderer } from '@/components/post/PortableTextRenderer';
import { extractPlainText } from '@/lib/reading-time';
import { sanityFetch } from '../../../../../sanity/lib/fetch';
import {
  ALL_QUESTION_SLUGS_QUERY,
  QUESTION_BY_SLUG_QUERY,
  type QuestionDetail,
  type QuestionSlug,
} from '../../../../../sanity/lib/queries';

export const revalidate = 3600;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

type Params = { locale: string; slug: string };
type Locale = 'ja' | 'ko';

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
  const slugs = await sanityFetch<QuestionSlug[]>({
    query: ALL_QUESTION_SLUGS_QUERY,
    revalidate: 0,
    fallback: [],
  });
  return slugs.flatMap((entry) => routing.locales.map((locale) => ({ locale, slug: entry.slug })));
}

async function fetchQuestion(slug: string) {
  return sanityFetch<QuestionDetail | null>({
    query: QUESTION_BY_SLUG_QUERY,
    params: { slug },
    tags: ['question', `question:${slug}`],
    fallback: null,
  });
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const q = await fetchQuestion(slug);
  if (!q) return {};
  const loc = locale as Locale;
  const title = pickLocaleString(q.title, loc);
  const canonicalPath = `/qa/${slug}`;
  const canonicalUrl =
    loc === 'ja' ? `${SITE_URL}${canonicalPath}` : `${SITE_URL}/${loc}${canonicalPath}`;
  return {
    title: `Q. ${title}`,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ja: `${SITE_URL}${canonicalPath}`,
        ko: `${SITE_URL}/ko${canonicalPath}`,
      },
    },
  };
}

export default async function QuestionPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;

  const q = await fetchQuestion(slug);
  if (!q) notFound();

  const t = await getTranslations('Qa');
  const title = pickLocaleString(q.title, loc);

  // Same locale-fallback pattern as the article detail: prefer the
  // current locale, fall back to the other with a small notice so the
  // page is useful even when the translation isn't ready.
  const primary = loc === 'ja' ? q.answerJa : q.answerKo;
  const fallback = loc === 'ja' ? q.answerKo : q.answerJa;
  const usedFallback = (!primary || primary.length === 0) && !!fallback?.length;
  const answer = usedFallback ? fallback : primary;

  // Schema.org QAPage — Google's recommended shape for single-Q pages.
  // The acceptedAnswer needs a plain-text body, so flatten Portable Text
  // here. Skip emitting the script entirely if there is no answer yet.
  const canonicalPath = `/qa/${slug}`;
  const canonicalUrl =
    loc === 'ja' ? `${SITE_URL}${canonicalPath}` : `${SITE_URL}/${loc}${canonicalPath}`;
  const answerText = answer ? extractPlainText(answer).trim() : '';
  const qaPageJsonLd =
    answerText.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'QAPage',
          mainEntity: {
            '@type': 'Question',
            name: title,
            text: title,
            inLanguage: loc === 'ja' ? 'ja-JP' : 'ko-KR',
            dateCreated: q.askedAt,
            answerCount: 1,
            acceptedAnswer: {
              '@type': 'Answer',
              text: answerText,
              inLanguage: loc === 'ja' ? 'ja-JP' : 'ko-KR',
              url: canonicalUrl,
            },
          },
        }
      : null;

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-16">
      {qaPageJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(qaPageJsonLd) }}
        />
      ) : null}
      <div className="mb-6">
        <Link
          href="/qa"
          className="inline-flex items-center text-xs tracking-wide text-zinc-500 uppercase hover:text-[var(--accent)]"
        >
          ← {t('title')}
        </Link>
      </div>

      <header className="mb-8 border-b border-[var(--border)] pb-6">
        <p className="font-hand mb-2 text-sm tracking-wide text-[var(--accent)]">
          {t(`pillars.${q.pillar}`)}
        </p>
        <h1 className="mb-4 text-2xl leading-snug font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
          Q. {title}
        </h1>
        <time className="text-sm text-zinc-500" dateTime={q.askedAt}>
          {formatDate(q.askedAt, loc)}
        </time>
      </header>

      {usedFallback ? (
        <div className="hand-box mb-6 rounded-md bg-[var(--accent-soft)] p-4 text-sm text-zinc-700 dark:text-zinc-300">
          {t('fallbackBanner')}
        </div>
      ) : null}

      <section className="mb-8">
        <h2 className="font-hand mb-3 text-base tracking-wide text-[var(--accent)]">
          {t('answerHeading')}
        </h2>
        {answer && answer.length > 0 ? (
          <div className="prose-tight">
            <PortableTextRenderer value={answer} />
          </div>
        ) : (
          <p className="text-sm text-zinc-500">{t('answerPending')}</p>
        )}
      </section>
    </article>
  );
}
