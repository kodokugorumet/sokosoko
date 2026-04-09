import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { PostCard } from '@/components/post/PostCard';
import { sanityFetch } from '../../../../sanity/lib/fetch';
import { SEARCH_POSTS_QUERY, type PostCard as PostCardType } from '../../../../sanity/lib/queries';

// Search results are user-driven and never the canonical home of any
// content — `generateMetadata` below sets `robots: noindex` to keep them
// out of crawl indexes and avoid duplicate-content signals.

type Params = { locale: string };
type Search = { q?: string };
type Locale = 'ja' | 'ko';

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

  // Q&A search was removed in Phase 2-D when questions moved to Supabase.
  // A Supabase-backed full-text search is a separate chunk of work (needs
  // a `tsvector` column + GIN index) and will land alongside the other
  // Supabase read paths in Phase 2-F.
  const posts = token
    ? await sanityFetch<PostCardType[]>({
        query: SEARCH_POSTS_QUERY,
        params: { q: token },
        // No `tags` here — search results aren't a stable cache key,
        // and the underlying `post` tag is already invalidated by the
        // revalidate webhook on content edits.
        revalidate: 60,
        fallback: [],
      })
    : ([] as PostCardType[]);

  const totalCount = posts.length;

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
            </div>
          )}
        </>
      )}
    </div>
  );
}
