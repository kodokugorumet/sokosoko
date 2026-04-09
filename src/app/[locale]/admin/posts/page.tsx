import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { listPostsByAuthor, type PostListRow } from '@/lib/posts/queries';

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return {
    title: t('posts.metaTitle'),
    robots: { index: false, follow: false },
  };
}

const STATUS_BADGE: Record<PostListRow['status'], string> = {
  draft: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  published: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
};

export default async function AdminPostsPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // requireRole bounces unauth'd users to /login, unonboarded to /onboarding,
  // and too-low-role to / without telling them this page exists.
  const user = await requireRole('operator');
  const t = await getTranslations('Admin.posts');

  const posts = await listPostsByAuthor(user.id);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:py-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-hand text-3xl tracking-wide text-[var(--ink)] sm:text-4xl">
            {t('heading')}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {t('subtitle', { count: posts.length })}
          </p>
        </div>
        <Link
          href="/admin/posts/new"
          className="rounded-md border border-[var(--border)] bg-[var(--ink)] px-4 py-2 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-[var(--accent)]"
        >
          {t('newButton')}
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="hand-box rounded-md bg-[var(--accent-soft)] p-10 text-center">
          <p className="font-hand mb-2 text-2xl tracking-wide text-[var(--ink)]">
            {t('empty.heading')}
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{t('empty.body')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => {
            const title =
              (locale === 'ja' ? post.title_ja : post.title_ko) ??
              post.title_ja ??
              post.title_ko ??
              t('untitled');
            return (
              <li key={post.id}>
                <Link
                  href={`/admin/posts/${post.id}`}
                  className="hand-box flex flex-col gap-1 rounded-md bg-[var(--background)] px-4 py-3 transition-colors hover:bg-[var(--accent-soft)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-base font-medium text-[var(--ink)]">
                      {title}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {post.board_slug} · {formatDate(post.updated_at, locale)}
                    </span>
                  </div>
                  <span
                    className={`inline-flex w-fit shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_BADGE[post.status]
                    }`}
                  >
                    {t(`status.${post.status}`)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
