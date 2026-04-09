import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { listHiddenComments } from '@/lib/comments/queries';
import { ModerationCommentActions } from './ModerationCommentActions';

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Moderation' });
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

/**
 * Moderation queue. For Phase 2-E this is just the list of comments
 * currently marked hidden — the moderator can unhide (restore) or delete
 * (purge) each row. Future phases will add pending posts, reported
 * comments, appeal trail, etc.
 *
 * Access is gated to operator/admin via `requireRole`. Members who know
 * the URL get redirected home without a hint that the page exists.
 */
export default async function ModerationPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireRole('operator');
  const t = await getTranslations('Moderation');

  const hidden = await listHiddenComments();

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:py-16">
      <h1 className="font-hand mb-2 text-3xl tracking-wide text-[var(--ink)] sm:text-4xl">
        {t('heading')}
      </h1>
      <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        {t('subtitle', { count: hidden.length })}
      </p>

      <section className="mb-10">
        <h2 className="font-hand mb-3 text-xl tracking-wide text-[var(--ink)]">
          {t('hiddenComments.heading')}
        </h2>

        {hidden.length === 0 ? (
          <div className="hand-box rounded-md bg-[var(--accent-soft)] p-6 text-center text-sm">
            {t('hiddenComments.empty')}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {hidden.map((comment) => (
              <li key={comment.id}>
                <div className="hand-box rounded-md bg-[var(--background)] p-4 text-sm">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span className="font-medium text-[var(--ink)]">{comment.author.nickname}</span>
                    <span aria-hidden>·</span>
                    <span>{formatDate(comment.created_at)}</span>
                    <span aria-hidden>·</span>
                    <Link
                      href={`/p/${comment.target_id}`}
                      className="underline-offset-2 hover:text-[var(--accent)] hover:underline"
                    >
                      {t('hiddenComments.viewSource')}
                    </Link>
                  </div>
                  <p className="mb-3 leading-relaxed break-words whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                    {comment.body}
                  </p>
                  <ModerationCommentActions commentId={comment.id} targetId={comment.target_id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 16).replace('T', ' ');
}
