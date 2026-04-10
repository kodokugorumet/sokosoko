'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import type { AnswerRow, UserRole } from '@/lib/posts/queries';
import { renderTipTapHtml, isTipTapEmpty } from '@/lib/tiptap/render';
import { deleteAnswer } from '../actions';
import { toggleHelpfulVote } from '@/lib/posts/vote-actions';

/**
 * Single answer card. Client Component only for the delete button's
 * confirm dialog + transition state; everything else (HTML render,
 * byline) is computed at call time and doesn't need interactivity.
 */

const ROLE_BADGE: Record<UserRole, string> = {
  admin: '👑',
  operator: '🏅',
  verified: '✅',
  member: '',
};

const ROLE_RING: Record<UserRole, string> = {
  admin: 'ring-2 ring-amber-400/60',
  operator: 'ring-2 ring-emerald-400/60',
  verified: 'ring-1 ring-sky-400/60',
  member: '',
};

type Props = {
  answer: AnswerRow;
  locale: 'ja' | 'ko';
  questionSlug: string;
  canDelete: boolean;
  /** Whether the current user already voted helpful on this answer. */
  voted: boolean;
  /** Whether the user is logged in (to show/hide the vote button). */
  isLoggedIn: boolean;
};

export function AnswerItem({
  answer,
  locale,
  questionSlug,
  canDelete,
  voted: initialVoted,
  isLoggedIn,
}: Props) {
  const t = useTranslations('Qa.detail');
  const [pending, startTransition] = useTransition();
  const [voted, setVoted] = useState(initialVoted);
  const [helpfulCount, setHelpfulCount] = useState(answer.helpful_count);

  const primaryBody = locale === 'ja' ? answer.body_ja : answer.body_ko;
  const fallbackBody = locale === 'ja' ? answer.body_ko : answer.body_ja;
  const body = !isTipTapEmpty(primaryBody) ? primaryBody : fallbackBody;
  const html = renderTipTapHtml(body);

  const createdAt = new Date(answer.created_at).toLocaleDateString(
    locale === 'ja' ? 'ja-JP' : 'ko-KR',
    { year: 'numeric', month: 'short', day: 'numeric' },
  );

  const badge = ROLE_BADGE[answer.author.role];
  const ring = ROLE_RING[answer.author.role];

  function handleDelete() {
    if (!window.confirm(t('deleteAnswerConfirm'))) return;
    startTransition(async () => {
      await deleteAnswer(answer.id, questionSlug);
    });
  }

  return (
    <article className={`hand-box rounded-md bg-[var(--background)] p-5 ${ring}`}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--ink)]">
            {badge ? `${badge} ` : ''}
            {answer.author.nickname}
          </span>
          <span className="text-zinc-400">·</span>
          <time className="text-zinc-500" dateTime={answer.created_at}>
            {createdAt}
          </time>
        </div>
        {canDelete ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="text-xs text-red-600 underline-offset-4 hover:underline disabled:opacity-60 dark:text-red-400"
          >
            {t('deleteAnswer')}
          </button>
        ) : null}
      </header>

      {html ? (
        <div
          className="prose prose-sm prose-zinc dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-sm text-zinc-500">{t('emptyAnswerBody')}</p>
      )}

      {/* Helpful vote button */}
      <div className="mt-3 flex items-center gap-2">
        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => {
              startTransition(async () => {
                const res = await toggleHelpfulVote(answer.id, questionSlug);
                if (res.ok) {
                  setVoted(res.voted);
                  if (res.newCount >= 0) setHelpfulCount(res.newCount);
                }
              });
            }}
            disabled={pending}
            className={`flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
              voted
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--background)] text-zinc-600 hover:border-[var(--accent)] dark:text-zinc-400'
            }`}
          >
            👍 {t('helpful')}
          </button>
        ) : null}
        {helpfulCount > 0 ? (
          <span className="text-xs text-zinc-500">
            {t('helpfulCount', { count: helpfulCount })}
          </span>
        ) : null}
      </div>
    </article>
  );
}
