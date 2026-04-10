import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/require-role';
import { getBoardBySlug } from '@/lib/posts/queries';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { CommunityPostForm } from './CommunityPostForm';

type Params = { locale: string; board: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Community' });
  return {
    title: t('new.metaTitle'),
    robots: { index: false, follow: true },
  };
}

/**
 * New community post page. Open to any onboarded member — no role gate
 * beyond basic auth, because community boards have
 * `allow_member_post=true`.
 */
export default async function NewCommunityPostPage({ params }: { params: Promise<Params> }) {
  const { locale, board: boardSlug } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) notFound();

  const boardRow = await getBoardBySlug(boardSlug).catch(() => null);
  if (!boardRow) notFound();

  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!user.onboarded) redirect('/onboarding');

  const t = await getTranslations('Community.new');
  const loc = locale as 'ja' | 'ko';
  const boardName = loc === 'ja' ? boardRow.name_ja : boardRow.name_ko;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-16">
      <h1 className="font-hand mb-2 text-3xl tracking-wide text-[var(--ink)] sm:text-4xl">
        {t('heading')}
      </h1>
      <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        {t('subtitle', { board: boardName, nickname: user.nickname })}
      </p>
      <CommunityPostForm boardSlug={boardSlug} />
    </div>
  );
}
