import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/require-role';
import { getBoardBySlug, getPublicPostByBoardSlug } from '@/lib/posts/queries';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { CommunityEditForm } from './CommunityEditForm';

type Params = { locale: string; board: string; slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Community' });
  return {
    title: t('edit.metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function CommunityEditPage({ params }: { params: Promise<Params> }) {
  const { locale, board: boardSlug, slug } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) notFound();

  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!user.onboarded) redirect('/onboarding');

  const boardRow = await getBoardBySlug(boardSlug).catch(() => null);
  if (!boardRow) notFound();

  const post = await getPublicPostByBoardSlug(boardSlug, slug).catch(() => null);
  if (!post) notFound();

  // Ownership check: author or admin/operator.
  const sb = await createClient();
  const { data: row } = await sb.from('posts').select('author_id').eq('id', post.id).maybeSingle();
  const isAuthor = row?.author_id === user.id;
  if (!isAuthor && user.role !== 'admin' && user.role !== 'operator') {
    redirect(`/community/${boardSlug}/${encodeURIComponent(slug)}`);
  }

  const t = await getTranslations('Community.edit');

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-16">
      <h1 className="font-hand mb-2 text-3xl tracking-wide text-[var(--ink)] sm:text-4xl">
        {t('heading')}
      </h1>
      <CommunityEditForm
        postId={post.id}
        boardSlug={boardSlug}
        initialTitleJa={post.title_ja ?? ''}
        initialTitleKo={post.title_ko ?? ''}
        initialBodyJa={post.body_ja}
        initialBodyKo={post.body_ko}
      />
    </div>
  );
}
