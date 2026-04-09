import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  getQuestionBySlug,
  listAnswersForQuestion,
  type AnswerRow,
  type UserRole,
} from '@/lib/posts/queries';
import { renderTipTapHtml, isTipTapEmpty } from '@/lib/tiptap/render';
import { getSessionUser } from '@/lib/auth/require-role';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { AnswerForm } from './AnswerForm';
import { AnswerItem } from './AnswerItem';

type Params = { locale: string; slug: string };
type Locale = 'ja' | 'ko';

const ROLE_BADGE: Record<UserRole, string> = {
  admin: '👑',
  operator: '🏅',
  verified: '✅',
  member: '',
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isSupabaseConfigured()) return { title: 'Q&A' };
  const post = await getQuestionBySlug(slug).catch(() => null);
  if (!post) return { title: 'Not found' };

  const loc = locale as Locale;
  const title =
    (loc === 'ja' ? post.title_ja : post.title_ko) ?? post.title_ja ?? post.title_ko ?? 'Q&A';
  const description =
    (loc === 'ja' ? post.excerpt_ja : post.excerpt_ko) ??
    post.excerpt_ja ??
    post.excerpt_ko ??
    undefined;
  return { title: `Q. ${title}`, description };
}

/**
 * Public Q&A detail page. Renders the question body, then the answer
 * list sorted by trust tier via `listAnswersForQuestion`, then the
 * answer form (or a "log in to answer" link for anonymous visitors).
 */
export default async function QuestionDetailPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) notFound();

  const post = await getQuestionBySlug(slug).catch((err) => {
    console.error('[QuestionDetailPage] getQuestionBySlug failed', { slug, err });
    return null;
  });
  if (!post) notFound();

  const [answers, user] = await Promise.all([
    listAnswersForQuestion(post.id).catch((err) => {
      console.error('[QuestionDetailPage] listAnswersForQuestion failed', {
        questionId: post.id,
        err,
      });
      return [] as AnswerRow[];
    }),
    getSessionUser(),
  ]);

  const t = await getTranslations('Qa.detail');
  const loc = locale as Locale;

  const title =
    (loc === 'ja' ? post.title_ja : post.title_ko) ??
    post.title_ja ??
    post.title_ko ??
    t('untitled');
  const primaryBody = loc === 'ja' ? post.body_ja : post.body_ko;
  const fallbackBody = loc === 'ja' ? post.body_ko : post.body_ja;
  const body = !isTipTapEmpty(primaryBody) ? primaryBody : fallbackBody;
  const isFallback = isTipTapEmpty(primaryBody) && !isTipTapEmpty(fallbackBody);
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
      <header className="mb-6">
        <h1 className="font-hand mb-4 text-3xl tracking-wide text-[var(--ink)] sm:text-4xl">
          Q. {title}
        </h1>
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
          className="prose prose-zinc dark:prose-invert mb-12 max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : null}

      <section className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="font-hand mb-4 text-xl tracking-wide text-[var(--ink)] sm:text-2xl">
          {t('answersHeading', { count: answers.length })}
        </h2>

        {answers.length === 0 ? (
          <p className="mb-6 text-sm text-zinc-500">{t('noAnswersYet')}</p>
        ) : (
          <ul className="mb-10 flex flex-col gap-6">
            {answers.map((a) => (
              <li key={a.id}>
                <AnswerItem
                  answer={a}
                  locale={loc}
                  questionSlug={slug}
                  canDelete={user?.id === a.author.id}
                />
              </li>
            ))}
          </ul>
        )}

        {user && user.onboarded ? (
          <AnswerForm questionId={post.id} />
        ) : (
          <div className="hand-box rounded-md bg-[var(--accent-soft)] p-4 text-sm">
            {t('loginToAnswer')}
          </div>
        )}
      </section>
    </article>
  );
}
