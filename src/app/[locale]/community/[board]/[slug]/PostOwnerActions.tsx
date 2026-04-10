'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { deleteCommunityPost } from './actions';

/**
 * Edit / Delete buttons shown to the post author on community post
 * detail pages. Operator/admin can also see these because the
 * `posts_admin_delete` policy allows them to delete any post, and the
 * `posts_admin_moderate` policy lets them update any post. The caller
 * (detail page) passes `canEdit` / `canDelete` booleans so we don't
 * duplicate the role-check logic here.
 */
type Props = {
  postId: string;
  boardSlug: string;
  postSlug: string;
  canEdit: boolean;
  canDelete: boolean;
};

export function PostOwnerActions({ postId, boardSlug, postSlug, canEdit, canDelete }: Props) {
  const t = useTranslations('Community.postActions');
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(t('deleteConfirm'))) return;
    startTransition(async () => {
      await deleteCommunityPost(postId, boardSlug);
    });
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      {canEdit ? (
        <Link
          href={`/community/${boardSlug}/${encodeURIComponent(postSlug)}/edit`}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)]"
        >
          {t('edit')}
        </Link>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {t('delete')}
        </button>
      ) : null}
    </div>
  );
}
