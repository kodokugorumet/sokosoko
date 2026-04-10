'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { createComment } from '@/lib/comments/actions';
import type { CommentTargetType } from '@/lib/comments/queries';

/**
 * Plain-text comment form. No rich text, no TipTap — comments are for
 * short reactions, and keeping them pure text means:
 *  - smaller client bundle (no editor instance per page)
 *  - no XSS surface (React auto-escapes text, no dangerouslySetInnerHTML)
 *  - no bilingual fallback dance (the reader just writes in whichever
 *    language they already comment in)
 */

type Props = {
  targetType: CommentTargetType;
  targetId: string;
  revalidatePathHint: string;
  /** Shrinks the textarea + button for the inline per-answer variant. */
  compact?: boolean;
  /** When set, the comment is a threaded reply under this parent. */
  parentId?: string;
};

const MAX = 2000;

export function CommentForm({
  targetType,
  targetId,
  revalidatePathHint,
  compact = false,
  parentId,
}: Props) {
  const t = useTranslations('Comments.form');
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createComment(formData);
      if (!res.ok) {
        setError(res.error);
      } else {
        setBody('');
      }
    });
  }

  const errorMessage = error
    ? (() => {
        switch (error) {
          case 'empty':
            return t('error.empty');
          case 'too-long':
            return t('error.tooLong');
          case 'unauthorized':
            return t('error.unauthorized');
          case 'invalid-target':
            return t('error.invalidTarget');
          default:
            return t('error.unknown');
        }
      })()
    : null;

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      {/* Target addressing + revalidate hint live in hidden fields so
          the server action has everything it needs without us threading
          ids through a closure. */}
      <input type="hidden" name="target_type" value={targetType} />
      <input type="hidden" name="target_id" value={targetId} />
      <input type="hidden" name="revalidate_path" value={revalidatePathHint} />
      {parentId ? <input type="hidden" name="parent_id" value={parentId} /> : null}
      <label className="flex flex-col gap-1">
        {!compact && <span className="text-sm font-medium text-[var(--ink)]">{t('label')}</span>}
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={compact ? 2 : 3}
          maxLength={MAX}
          placeholder={compact ? t('placeholderCompact') : t('placeholder')}
          className="hand-box rounded-md bg-[var(--background)] px-4 py-2 text-sm leading-relaxed focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
          disabled={pending}
        />
        {!compact && (
          <span className="text-xs text-zinc-500">
            {body.length}/{MAX}
          </span>
        )}
      </label>

      {errorMessage ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={pending || body.trim().length === 0}
          className={
            compact
              ? 'rounded-md border border-[var(--border)] bg-[var(--ink)] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60'
              : 'rounded-md border border-[var(--border)] bg-[var(--ink)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60'
          }
        >
          {pending ? t('submitting') : t('submit')}
        </button>
      </div>
    </form>
  );
}
