import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { requireRole } from '@/lib/auth/require-role';
import { listBoards } from '@/lib/posts/queries';
import { PostForm } from '../PostForm';

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return {
    title: t('posts.new.metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function NewAdminPostPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireRole('operator');
  const t = await getTranslations('Admin.posts.new');

  // Operators/admins can post to article boards. Q&A is member-writable
  // and handled by a different flow in Phase 2-D, so exclude it here to
  // avoid confusing the form with a board it doesn't know how to render.
  const allBoards = await listBoards();
  const boards = allBoards.filter((b) => b.kind === 'article');

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-16">
      <h1 className="font-hand mb-2 text-3xl tracking-wide text-[var(--ink)] sm:text-4xl">
        {t('heading')}
      </h1>
      <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        {t('subtitle', { nickname: user.nickname })}
      </p>
      <PostForm mode="create" boards={boards} />
    </div>
  );
}
