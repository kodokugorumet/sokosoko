import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { getSessionUser } from '@/lib/auth/require-role';
import { listPublishedQuestions, type QuestionListRow, type UserRole } from '@/lib/posts/queries';
import { isSupabaseConfigured } from '@/lib/supabase/server';

type Params = { locale: string };
type Locale = 'ja' | 'ko';

const ROLE_BADGE: Record<UserRole, string> = {
  admin: '👑',
  operator: '🏅',
  verified: '✅',
  member: '',
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Qa' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

/**
 * Q&A list page. Public, no auth required. Shows every published
 * question newest-first with the asker's nickname + role badge and the
 * current answer count. "질문하기" CTA only rendered for signed-in users
 * (anonymous visitors see a login prompt below the list).
 */
export default async function QaListPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Qa');
  const loc = locale as Locale;

  // Graceful degrade: without Supabase env vars we still render the page
  // chrome so the site doesn't 500 during local dev or CI builds.
  const [questions, user] = await Promise.all([
    isSupabaseConfigured() ? listPublishedQuestions().catch(() => []) : Promise.resolve([]),
    getSessionUser(),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:py-16">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="mb-8 flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t('countSummary', { count: questions.length })}
        </p>
        {user ? (
          <Link
            href="/qa/new"
            className="rounded-md border border-[var(--border)] bg-[var(--ink)] px-4 py-2 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-[var(--accent)]"
          >
            {t('askButton')}
          </Link>
        ) : (
          <Link
            href="/login"
            className="hand-box rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap hover:bg-[var(--accent-soft)]"
          >
            {t('loginToAsk')}
          </Link>
        )}
      </div>

      {questions.length === 0 ? (
        <div className="hand-box rounded-md bg-[var(--accent-soft)] p-10 text-center">
          <p className="font-hand mb-2 text-2xl tracking-wide text-[var(--ink)]">
            {t('empty.heading')}
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{t('empty.body')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {questions.map((q) => (
            <li key={q.id}>
              <QuestionRow question={q} locale={loc} t={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuestionRow({
  question,
  locale,
  t,
}: {
  question: QuestionListRow;
  locale: Locale;
  t: Awaited<ReturnType<typeof getTranslations<'Qa'>>>;
}) {
  const title =
    (locale === 'ja' ? question.title_ja : question.title_ko) ??
    question.title_ja ??
    question.title_ko ??
    t('untitled');
  const excerpt =
    (locale === 'ja' ? question.excerpt_ja : question.excerpt_ko) ??
    question.excerpt_ja ??
    question.excerpt_ko ??
    null;
  const badge = ROLE_BADGE[question.author.role];

  return (
    <Link
      href={`/qa/${question.slug}`}
      className="hand-box flex flex-col gap-2 rounded-md bg-[var(--background)] p-4 transition-colors hover:bg-[var(--accent-soft)]"
    >
      <h3 className="text-base font-medium tracking-tight text-[var(--ink)]">Q. {title}</h3>
      {excerpt ? (
        <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{excerpt}</p>
      ) : null}
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span>
          {badge ? `${badge} ` : ''}
          {question.author.nickname}
        </span>
        <span>·</span>
        <span>{t('answerCount', { count: question.answer_count })}</span>
      </div>
    </Link>
  );
}
