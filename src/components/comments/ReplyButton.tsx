'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CommentForm } from './CommentForm';
import type { CommentTargetType } from '@/lib/comments/queries';

/**
 * Inline reply button that toggles a compact CommentForm under the
 * comment card. The form's `parent_id` is set to the comment being
 * replied to, so the server action creates a threaded reply.
 */
type Props = {
  targetType: CommentTargetType;
  targetId: string;
  parentId: string;
  revalidatePathHint: string;
};

export function ReplyButton({ targetType, targetId, parentId, revalidatePathHint }: Props) {
  const t = useTranslations('Comments.actions');
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-zinc-500 underline-offset-4 hover:text-[var(--accent)] hover:underline"
      >
        {open ? t('cancelReply') : t('reply')}
      </button>
      {open ? (
        <div className="mt-2">
          <CommentForm
            targetType={targetType}
            targetId={targetId}
            revalidatePathHint={revalidatePathHint}
            compact
            parentId={parentId}
          />
        </div>
      ) : null}
    </div>
  );
}
