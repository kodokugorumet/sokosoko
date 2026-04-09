import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { getAdminPostByIdWithAuthor, type UserRole } from '@/lib/posts/queries';
import { PostForm } from '../PostForm';
import { PublishActions } from './PublishActions';

type Params = { locale: string; id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return {
    title: t('posts.edit.metaTitle'),
    robots: { index: false, follow: false },
  };
}

const ROLE_BADGE: Record<UserRole, string> = {
  admin: '👑',
  operator: '🏅',
  verified: '✅',
  member: '',
};

export default async function EditAdminPostPage({ params }: { params: Promise<Params> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await requireRole('operator');
  const t = await getTranslations('Admin.posts.edit');

  const post = await getAdminPostByIdWithAuthor(id).catch((err) => {
    console.error('[EditAdminPostPage] getAdminPostByIdWithAuthor failed', { id, err });
    return null;
  });
  if (!post) notFound();

  const isForeignAuthor = post.author.id !== user.id;
  const authorBadge = ROLE_BADGE[post.author.role] ?? '';
  // Build the canonical public URL — the legacy /p/[id] redirect exists
  // but the direct /[board]/[slug] is what readers actually share, so
  // link there from the admin edit screen too.
  const publicHref =
    post.status === 'published' && post.slug
      ? `/${post.board_slug}/${encodeURIComponent(post.slug)}`
      : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-16">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="font-hand text-3xl tracking-wide text-[var(--ink)] sm:text-4xl">
          {t('heading')}
        </h1>
        {publicHref ? (
          <Link
            href={publicHref}
            className="text-xs text-zinc-500 underline-offset-4 hover:text-[var(--accent)] hover:underline"
          >
            {t('viewPublic')}
          </Link>
        ) : null}
      </div>

      {/* Foreign-author warning: an admin editing another operator's
          draft should be able to see whose work they're touching before
          they hit Save. Own posts show nothing (cleaner default). */}
      {isForeignAuthor ? (
        <div className="hand-box mb-4 rounded-md bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
          {t('byAuthor', {
            nickname: `${authorBadge ? `${authorBadge} ` : ''}${post.author.nickname}`,
          })}
        </div>
      ) : null}

      <div className="mb-8 flex items-center gap-2 text-xs">
        <StatusBadge status={post.status} />
        <span className="text-zinc-500">
          {t('lastUpdated', { date: formatDate(post.updated_at, locale) })}
        </span>
      </div>

      <PostForm mode="edit" initial={post} />

      <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <PublishActions post={post} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    published: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.draft}`}
    >
      {status}
    </span>
  );
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale === 'ja' ? 'ja-JP' : 'ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
