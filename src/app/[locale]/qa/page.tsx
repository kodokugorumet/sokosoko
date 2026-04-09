import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { sanityFetch } from '../../../../sanity/lib/fetch';
import { QUESTIONS_QUERY, type QuestionCard } from '../../../../sanity/lib/queries';

export const revalidate = 3600;

type Params = { locale: string };
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

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Qa' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

// Planned-topic placeholder cards shown when no Sanity questions exist yet.
const CATEGORY_KEYS = [0, 1, 2, 3] as const;

export default async function QaPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Qa');
  const loc = locale as Locale;

  // Tagged so the /api/revalidate webhook can refresh the list when a
  // new question is published in Studio.
  const questions = await sanityFetch<QuestionCard[]>({
    query: QUESTIONS_QUERY,
    tags: ['question'],
    fallback: [],
  });

  const featured = questions.filter((q) => q.featured);
  const regular = questions.filter((q) => !q.featured);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-16">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <p className="mb-10 leading-relaxed text-zinc-700 dark:text-zinc-300">{t('intro')}</p>

      {questions.length === 0 ? (
        <>
          {/* Empty-state: directs early visitors to Contact while the Q&A is empty */}
          <section className="hand-box mb-12 rounded-md bg-[var(--accent-soft)] p-6 text-center sm:p-8">
            <h2 className="font-hand mb-3 text-xl tracking-wide text-[var(--ink)] sm:text-2xl">
              {t('comingSoon.heading')}
            </h2>
            <p className="mx-auto mb-5 max-w-xl text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {t('comingSoon.body')}
            </p>
            <Link
              href="/contact"
              className="inline-block rounded-md border border-[var(--border)] bg-[var(--background)] px-5 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent)] hover:text-white"
            >
              {t('comingSoon.contactLabel')}
            </Link>
          </section>

          <section>
            <h2 className="font-hand mb-5 text-lg tracking-wide text-[var(--ink)] sm:text-xl">
              {t('categories.heading')}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {CATEGORY_KEYS.map((i) => (
                <li key={i} className="hand-box rounded-md p-5">
                  <h3 className="mb-2 text-base font-medium">{t(`categories.items.${i}.title`)}</h3>
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {t(`categories.items.${i}.body`)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <>
          {featured.length > 0 ? (
            <section className="mb-10">
              <h2 className="font-hand mb-4 text-lg tracking-wide text-[var(--ink)] sm:text-xl">
                {t('featuredHeading')}
              </h2>
              <ul className="space-y-3">
                {featured.map((q) => (
                  <QuestionRow key={q._id} q={q} loc={loc} t={t} />
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="font-hand mb-4 text-lg tracking-wide text-[var(--ink)] sm:text-xl">
              {t('allHeading')}
            </h2>
            <ul className="space-y-3">
              {regular.map((q) => (
                <QuestionRow key={q._id} q={q} loc={loc} t={t} />
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function QuestionRow({ q, loc, t }: { q: QuestionCard; loc: Locale; t: (key: string) => string }) {
  const title = pickLocaleString(q.title, loc);
  return (
    <li>
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
}
