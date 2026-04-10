'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import type { AdminPostRow } from '@/lib/posts/queries';
import { publishPost, unpublishPost, deletePost } from '../actions';

/**
 * Publish / unpublish / delete buttons + SNS syndication toggle for
 * the admin edit page. The X toggle checkbox is only shown when the
 * post is unpublished (about to be published) — re-syndicating an
 * already-published post would tweet a duplicate.
 */
export function PublishActions({ post }: { post: AdminPostRow }) {
  const t = useTranslations('Admin.posts.edit');
  const [pending, startTransition] = useTransition();
  const [syndicateToX, setSyndicateToX] = useState(false);

  function handlePublish() {
    startTransition(async () => {
      await publishPost(post.id, syndicateToX);
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
    <div className="flex flex-col gap-4">
      {/* SNS syndication toggle — only when about to publish */}
      {post.status !== 'published' ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={syndicateToX}
            onChange={(e) => setSyndicateToX(e.target.checked)}
            disabled={pending}
            className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span className="text-zinc-700 dark:text-zinc-300">{t('syndicateToX')}</span>
        </label>
      ) : null}

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
    </div>
  );
}
