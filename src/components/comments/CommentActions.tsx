'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { deleteComment, setCommentHidden } from '@/lib/comments/actions';

/**
 * Row of action buttons under each comment card. Shown conditionally:
 *   - `delete` appears when the current user authored this comment
 *     (RLS would block a non-author anyway, but hiding the UI is
 *      friendlier than a click that silently fails).
 *   - `hide` / `unhide` appears when the current user is operator/admin.
 *
 * Lives in its own tiny Client Component so the CommentThread itself
 * can stay a Server Component. No local state — everything goes through
 * server actions that revalidate the parent page.
 */

type Props = {
  commentId: string;
  canDelete: boolean;
  canModerate: boolean;
  hidden: boolean;
  revalidatePathHint: string;
};

export function CommentActions({
  commentId,
  canDelete,
  canModerate,
  hidden,
  revalidatePathHint,
}: Props) {
  const t = useTranslations('Comments.actions');
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(t('deleteConfirm'))) return;
    startTransition(async () => {
      await deleteComment(commentId, revalidatePathHint);
    });
  }

  function handleToggleHidden() {
    startTransition(async () => {
      await setCommentHidden(commentId, !hidden, revalidatePathHint);
    });
  }

  return (
    <div className="mt-2 flex gap-2 text-xs">
      {canDelete ? (
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="rounded border border-transparent px-2 py-1 text-red-600 hover:bg-red-50 hover:underline disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          {t('delete')}
        </button>
      ) : null}
      {canModerate ? (
        <button
          type="button"
          onClick={handleToggleHidden}
          disabled={pending}
          className="rounded border border-transparent px-2 py-1 text-zinc-600 hover:bg-[var(--accent-soft)] hover:underline disabled:opacity-60 dark:text-zinc-400"
        >
          {hidden ? t('unhide') : t('hide')}
        </button>
      ) : null}
    </div>
  );
}
