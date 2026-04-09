'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { setCommentHidden, deleteComment } from '@/lib/comments/actions';

/**
 * Client row of action buttons for the moderation queue. Kept minimal
 * on purpose — operators should be able to make a decision and move on
 * with one click. Every button runs in a `useTransition` so the UI
 * stays responsive while the server action + cache revalidation round-trip
 * happens.
 */
export function ModerationCommentActions({
  commentId,
  targetId,
}: {
  commentId: string;
  targetId: string;
}) {
  const t = useTranslations('Moderation.hiddenComments.actions');
  const [pending, startTransition] = useTransition();

  const hint = `/p/${targetId}`;

  function handleUnhide() {
    startTransition(async () => {
      await setCommentHidden(commentId, false, hint);
    });
  }

  function handleDelete() {
    if (!window.confirm(t('deleteConfirm'))) return;
    startTransition(async () => {
      await deleteComment(commentId, hint);
    });
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={handleUnhide}
        disabled={pending}
        className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs font-medium hover:bg-[var(--accent-soft)] disabled:opacity-60"
      >
        {t('unhide')}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="rounded border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      >
        {t('delete')}
      </button>
    </div>
  );
}
