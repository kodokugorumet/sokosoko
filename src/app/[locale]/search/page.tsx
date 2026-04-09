import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { PostCard } from '@/components/post/PostCard';
import { sanityFetch } from '../../../../sanity/lib/fetch';
import {
  SEARCH_POSTS_QUERY,
  SEARCH_QUESTIONS_QUERY,
  type PostCard as PostCardType,
  type QuestionCard,
} from '../../../../sanity/lib/queries';

// Search results are user-driven and never the canonical home of any
// content — `generateMetadata` below sets `robots: noindex` to keep them
// out of crawl indexes and avoid duplicate-content signals.

type Params = { locale: string };
type Search = { q?: string };
type Locale = 'ja' | 'ko';

function pickLocaleString(value: { ja?: string; ko?: string } | undefined, locale: Locale) {
  if (!value) return '';
  return value[locale] ?? value[locale === 'ja' ? 'ko' : 'ja'] ?? '';
}

function formatDate(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Build a GROQ `match` token from raw user input. GROQ matches whole
 * words by default; appending `*` to each whitespace-separated token
 * gives prefix matching, which is closer to what users expect from a
 * site search. Also strips quotes / parens / wildcards the user might
 * have typed so the token stays a literal.
 */
function buildMatchToken(raw: string): string {
  return raw
    .replace(/[*"'()[\]\\]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `${t}*`)
    .join(' ');
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Search' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const { q: rawQ } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations('Search');
  const loc = locale as Locale;

  const query = (rawQ ?? '').trim();
  const token = query ? buildMatchToken(query) : '';

  const [posts, questions] = token
    ? await Promise.all([
        sanityFetch<PostCardType[]>({
          query: SEARCH_POSTS_QUERY,
          params: { q: token },
          // No `tags` here — search results aren't a stable cache key,
          // and the underlying `post` / `question` tags are already
          // invalidated by the revalidate webhook on content edits.
          revalidate: 60,
          fallback: [],
        }),
        sanityFetch<QuestionCard[]>({
          query: SEARCH_QUESTIONS_QUERY,
          params: { q: token },
          revalidate: 60,
          fallback: [],
        }),
      ])
    : [[] as PostCardType[], [] as QuestionCard[]];

  const totalCount = posts.length + questions.length;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:py-16">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {!query ? (
        <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">{t('promptEmpty')}</p>
      ) : (
        <>
          <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
            {t('resultSummary', { query, count: totalCount })}
          </p>

          {totalCount === 0 ? (
            <div className="hand-box rounded-md bg-[var(--accent-soft)] p-8 text-center">
              <h2 className="font-hand mb-3 text-xl tracking-wide text-[var(--ink)]">
                {t('noResults.heading')}
              </h2>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{t('noResults.body')}</p>
            </div>
          ) : (
            <div className="space-y-12">
              {posts.length > 0 ? (
                <section>
                  <h2 className="font-hand mb-4 text-lg tracking-wide text-[var(--ink)] sm:text-xl">
                    {t('postsHeading', { count: posts.length })}
                  </h2>
                  <ul className="grid gap-6 sm:grid-cols-2">
                    {posts.map((post) => (
                      <li key={post._id}>
                        <PostCard post={post} locale={loc} />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {questions.length > 0 ? (
                <section>
                  <h2 className="font-hand mb-4 text-lg tracking-wide text-[var(--ink)] sm:text-xl">
                    {t('questionsHeading', { count: questions.length })}
                  </h2>
                  <ul className="space-y-3">
                    {questions.map((q) => {
                      const title = pickLocaleString(q.title, loc);
                      return (
                        <li key={q._id}>
                          <Link
                            href={`/qa/${q.slug}`}
                            className="hand-box group flex flex-col gap-1 rounded-md p-4 transition-colors hover:bg-[var(--accent-soft)] sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex flex-1 flex-col gap-1">
                              <span className="font-hand text-xs tracking-wide text-[var(--accent)]">
                                {t(`pillars.${q.pillar}`)}
                              </span>
                              <h3 className="text-base font-medium tracking-tight text-[var(--ink)] group-hover:text-[var(--accent)]">
                                Q. {title}
                              </h3>
                            </div>
                            <time className="text-xs text-zinc-500" dateTime={q.askedAt}>
                              {formatDate(q.askedAt, loc)}
                            </time>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
