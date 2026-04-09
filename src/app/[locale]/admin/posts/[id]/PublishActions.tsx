'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import type { AdminPostRow } from '@/lib/posts/queries';
import { publishPost, unpublishPost, deletePost } from '../actions';

/**
 * Publish / unpublish / delete buttons for the edit page. Lives in its
 * own Client Component so the edit page itself can stay a Server
 * Component and the form-state management stays isolated from the
 * bigger PostForm (fewer re-renders when the author just wants to click
 * "publish").
 */
export function PublishActions({ post }: { post: AdminPostRow }) {
  const t = useTranslations('Admin.posts.edit');
  const [pending, startTransition] = useTransition();

  function handlePublish() {
    startTransition(async () => {
      await publishPost(post.id);
    });
  }

  function handleUnpublish() {
    startTransition(async () => {
      await unpublishPost(post.id);
    });
  }

  function handleDelete() {
    if (!window.confirm(t('deleteConfirm'))) return;
    startTransition(async () => {
      await deletePost(post.id);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {post.status === 'published' ? (
        <button
          type="button"
          onClick={handleUnpublish}
          disabled={pending}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)] disabled:opacity-60"
        >
          {t('unpublish')}
        </button>
      ) : (
        <button
          type="button"
          onClick={handlePublish}
          disabled={pending}
          className="rounded-md border border-[var(--border)] bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {t('publish')}
        </button>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="ml-auto rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      >
        {t('delete')}
      </button>
    </div>
  );
}
