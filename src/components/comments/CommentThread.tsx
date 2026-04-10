import { getLocale, getTranslations } from 'next-intl/server';
import {
  listCommentsForTarget,
  type CommentTargetType,
  type CommentRow,
} from '@/lib/comments/queries';
import { getSessionUser } from '@/lib/auth/require-role';
import { formatRelativeTime, type Locale } from '@/lib/relative-time';
import { CommentForm } from './CommentForm';
import { CommentActions } from './CommentActions';
import { ReplyButton } from './ReplyButton';

/**
 * Server Component: fetches comments for a given target (post or answer),
 * renders them flat-then-indented (parent → children grouped under parent),
 * and appends a reply form for signed-in users. Anonymous visitors see a
 * "login to comment" prompt instead.
 *
 * Comments are fetched fresh on every request — no client-side mutation —
 * because the server actions in `lib/comments/actions.ts` call
 * `revalidatePath` which invalidates this page's cache, and the data
 * volume at Phase 2-E is trivially small.
 */

type Props = {
  targetType: CommentTargetType;
  targetId: string;
  /** Absolute site path the server action should revalidate after mutating. */
  revalidatePathHint: string;
  /**
   * Visual density. `full` (default) is the top-of-page comment section
   * with a big handwritten heading; `compact` is for threads nested
   * under a parent item (e.g. per-answer replies on /qa/[slug]) where
   * the page header hierarchy should not be disturbed.
   */
  variant?: 'full' | 'compact';
};

const ROLE_BADGE: Record<string, string> = {
  admin: '👑',
  operator: '🏅',
  verified: '✅',
  member: '',
};

export async function CommentThread({
  targetType,
  targetId,
  revalidatePathHint,
  variant = 'full',
}: Props) {
  const t = await getTranslations('Comments');
  const localeStr = await getLocale();
  const locale: Locale = localeStr === 'ko' ? 'ko' : 'ja';
  const [comments, user] = await Promise.all([
    listCommentsForTarget(targetType, targetId).catch((err) => {
      console.error('[CommentThread] list failed', { targetType, targetId, err });
      return [] as CommentRow[];
    }),
    getSessionUser(),
  ]);

  // Group comments into roots + children-by-parent so the render is a
  // single pass without recursive state.
  const rootComments = comments.filter((c) => c.parent_id === null);
  const childrenByParent = new Map<string, CommentRow[]>();
  for (const c of comments) {
    if (c.parent_id !== null) {
      const list = childrenByParent.get(c.parent_id) ?? [];
      list.push(c);
      childrenByParent.set(c.parent_id, list);
    }
  }

  const canModerate = user?.role === 'admin' || user?.role === 'operator';
  const isCompact = variant === 'compact';

  return (
    <section
      className={isCompact ? 'mt-2' : 'mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800'}
    >
      {isCompact ? (
        <h3 className="mb-3 text-xs font-medium tracking-wide text-zinc-500 uppercase">
          {t('headingCompact', { count: comments.length })}
        </h3>
      ) : (
        <h2 className="font-hand mb-4 text-xl tracking-wide text-[var(--ink)] sm:text-2xl">
          {t('heading', { count: comments.length })}
        </h2>
      )}

      {rootComments.length === 0 && isCompact ? null : rootComments.length === 0 ? (
        <p className="mb-6 text-sm text-zinc-500">{t('empty')}</p>
      ) : (
        <ul className="mb-10 flex flex-col gap-4">
          {rootComments.map((root) => (
            <li key={root.id}>
              <CommentCard
                comment={root}
                canDelete={user?.id === root.author.id}
                canModerate={canModerate}
                canReply={!!user && user.onboarded}
                targetType={targetType}
                targetId={targetId}
                revalidatePathHint={revalidatePathHint}
                locale={locale}
              />
              {(childrenByParent.get(root.id) ?? []).length > 0 ? (
                <ul className="mt-3 ml-6 flex flex-col gap-3 border-l border-zinc-200 pl-4 dark:border-zinc-800">
                  {childrenByParent.get(root.id)!.map((child) => (
                    <li key={child.id}>
                      <CommentCard
                        comment={child}
                        canDelete={user?.id === child.author.id}
                        canModerate={canModerate}
                        canReply={false}
                        targetType={targetType}
                        targetId={targetId}
                        revalidatePathHint={revalidatePathHint}
                        locale={locale}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {user && user.onboarded ? (
        <CommentForm
          targetType={targetType}
          targetId={targetId}
          revalidatePathHint={revalidatePathHint}
          compact={isCompact}
        />
      ) : isCompact ? null : (
        <div className="hand-box rounded-md bg-[var(--accent-soft)] p-4 text-sm">
          {t('loginPrompt')}
        </div>
      )}
    </section>
  );
}

function CommentCard({
  comment,
  canDelete,
  canModerate,
  canReply,
  targetType,
  targetId,
  revalidatePathHint,
  locale,
}: {
  comment: CommentRow;
  canDelete: boolean;
  canModerate: boolean;
  canReply: boolean;
  targetType: CommentTargetType;
  targetId: string;
  revalidatePathHint: string;
  locale: Locale;
}) {
  return (
    <div className="hand-box rounded-md bg-[var(--background)] p-3 text-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span className="font-medium text-[var(--ink)]">
          {ROLE_BADGE[comment.author.role] ? `${ROLE_BADGE[comment.author.role]} ` : ''}
          {comment.author.nickname}
        </span>
        <span aria-hidden>·</span>
        <time dateTime={comment.created_at}>{formatRelativeTime(comment.created_at, locale)}</time>
        {comment.hidden ? (
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
            hidden
          </span>
        ) : null}
      </div>
      <p className="leading-relaxed break-words whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
        {comment.body}
      </p>
      <div className="mt-2 flex items-center gap-3">
        {canDelete || canModerate ? (
          <CommentActions
            commentId={comment.id}
            canDelete={canDelete}
            canModerate={canModerate}
            hidden={comment.hidden}
            revalidatePathHint={revalidatePathHint}
          />
        ) : null}
        {canReply ? (
          <ReplyButton
            targetType={targetType}
            targetId={targetId}
            parentId={comment.id}
            revalidatePathHint={revalidatePathHint}
          />
        ) : null}
      </div>
    </div>
  );
}
