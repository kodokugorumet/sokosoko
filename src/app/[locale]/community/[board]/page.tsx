import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { PostCard } from '@/components/post/PostCard';
import { getBoardBySlug, listPublishedPostsByBoard } from '@/lib/posts/queries';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/require-role';

type Params = { locale: string; board: string };
type Locale = 'ja' | 'ko';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, board: boardSlug } = await params;
  if (!isSupabaseConfigured()) return {};
  const boardRow = await getBoardBySlug(boardSlug).catch(() => null);
  if (!boardRow) return {};
  const t = await getTranslations({ locale, namespace: 'Community' });
  const name = locale === 'ja' ? boardRow.name_ja : boardRow.name_ko;
  return {
    title: `${name} | ${t('metaTitle')}`,
  };
}

/**
 * Community board listing page. Shows every published post in a
 * member-writable board, newest first. Signed-in users see a CTA
 * to write a new post; anonymous visitors see a login prompt.
 */
export default async function CommunityBoardPage({ params }: { params: Promise<Params> }) {
  const { locale, board: boardSlug } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) notFound();

  const boardRow = await getBoardBySlug(boardSlug).catch(() => null);
  if (!boardRow) notFound();

  const loc = locale as Locale;
  const t = await getTranslations('Community');

  const [posts, user] = await Promise.all([
    listPublishedPostsByBoard(boardSlug).catch(() => []),
    getSessionUser(),
  ]);

  const name = loc === 'ja' ? boardRow.name_ja : boardRow.name_ko;
  const desc =
    loc === 'ja'
      ? (boardRow.description_ja ?? boardRow.description_ko ?? '')
      : (boardRow.description_ko ?? boardRow.description_ja ?? '');

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:py-16">
      <PageHeader title={name} subtitle={desc} />

      <div className="mb-8 flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t('postCount', { count: posts.length })}
        </p>
        {user && user.onboarded ? (
          <Link
            href={`/community/${boardSlug}/new`}
            className="rounded-md border border-[var(--border)] bg-[var(--ink)] px-4 py-2 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-[var(--accent)]"
          >
            {t('writeButton')}
          </Link>
        ) : (
          <Link
            href="/login"
            className="hand-box rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap hover:bg-[var(--accent-soft)]"
          >
            {t('loginToWrite')}
          </Link>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="hand-box rounded-md bg-[var(--accent-soft)] p-10 text-center">
          <p className="font-hand mb-2 text-2xl tracking-wide text-[var(--ink)]">
            {t('boardEmpty.heading')}
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{t('boardEmpty.body')}</p>
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} locale={loc} hrefPrefix={`/community/${boardSlug}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
