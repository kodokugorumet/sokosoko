import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { PostCard } from '@/components/post/PostCard';
import {
  searchPublishedPosts,
  searchPublishedQuestions,
  type PublicPostCardRow,
  type QuestionListRow,
  type UserRole,
} from '@/lib/posts/queries';

// Search results are user-driven and never the canonical home of any
// content — `generateMetadata` below sets `robots: noindex` to keep them
// out of crawl indexes and avoid duplicate-content signals.

type Params = { locale: string };
type Search = { q?: string };
type Locale = 'ja' | 'ko';

const ROLE_BADGE: Record<UserRole, string> = {
  admin: '👑',
  operator: '🏅',
  verified: '✅',
  member: '',
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Search' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: true },
  };
}

function pickLocaleString(a: string | null, b: string | null): string {
  return (a ?? b ?? '').trim();
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

  // Run both searches in parallel so the slower of the two dominates
  // the page latency instead of their sum. Empty query skips both
  // queries and renders the "prompt" state below.
  let posts: PublicPostCardRow[] = [];
  let questions: QuestionListRow[] = [];
  if (query) {
    [posts, questions] = await Promise.all([
      searchPublishedPosts(query).catch((err) => {
        console.error('[SearchPage] searchPublishedPosts failed', err);
        return [] as PublicPostCardRow[];
      }),
      searchPublishedQuestions(query).catch((err) => {
        console.error('[SearchPage] searchPublishedQuestions failed', err);
        return [] as QuestionListRow[];
      }),
    ]);
  }

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
                      <li key={post.id}>
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
                  <ul className="flex flex-col gap-3">
                    {questions.map((q) => {
                      const title =
                        loc === 'ja'
                          ? pickLocaleString(q.title_ja, q.title_ko)
                          : pickLocaleString(q.title_ko, q.title_ja);
                      const excerpt =
                        loc === 'ja'
                          ? pickLocaleString(q.excerpt_ja, q.excerpt_ko)
                          : pickLocaleString(q.excerpt_ko, q.excerpt_ja);
                      const badge = ROLE_BADGE[q.author.role];
                      return (
                        <li key={q.id}>
                          <Link
                            href={`/qa/${encodeURIComponent(q.slug)}`}
                            className="hand-box flex flex-col gap-1 rounded-md bg-[var(--background)] p-4 transition-colors hover:bg-[var(--accent-soft)]"
                          >
                            <h3 className="text-base font-medium tracking-tight text-[var(--ink)]">
                              Q. {title}
                            </h3>
                            {excerpt ? (
                              <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                                {excerpt}
                              </p>
                            ) : null}
                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                              <span>
                                {badge ? `${badge} ` : ''}
                                {q.author.nickname}
                              </span>
                            </div>
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
