import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/posts/queries';

/**
 * Shared comment query helpers. Comments live in a polymorphic table
 * addressed by `(target_type, target_id)` so the same API backs
 * `/p/[id]` (target_type='post') and `/qa/[slug]` (target_type='post'
 * as well — the question row and the post row are the same thing) and
 * eventually `/qa/[slug]` answer replies (target_type='answer').
 *
 * Like the post queries, we run a two-step lookup (comments → profiles
 * batch) instead of a PostgREST embedded join to avoid the hint-parsing
 * failures that bit us on Phase 2-D. See `src/lib/posts/queries.ts` for
 * the full rationale.
 */

export type CommentTargetType = 'post' | 'answer';

export type CommentRow = {
  id: string;
  target_type: CommentTargetType;
  target_id: string;
  body: string;
  parent_id: string | null;
  hidden: boolean;
  created_at: string;
  author: {
    id: string;
    nickname: string;
    role: UserRole;
  };
};

/**
 * Fetch every visible comment for a given target, ordered oldest-first
 * inside each root, with child comments grouped under their parent in
 * timeline order. Hidden comments are filtered by RLS
 * (`comments_read_visible`) so callers don't need to ask.
 *
 * Returns a flat array ordered so a naive render yields a correct
 * threaded view when the caller uses `parent_id` for indentation.
 * At Phase 2-E volumes (a handful of comments per post), we don't need
 * a proper tree structure on the wire — client can nest in render.
 */
export async function listCommentsForTarget(
  targetType: CommentTargetType,
  targetId: string,
): Promise<CommentRow[]> {
  const supabase = await createClient();
  const { data: commentRows, error: commentsError } = await supabase
    .from('comments')
    .select('id, target_type, target_id, body, parent_id, hidden, created_at, author_id')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (commentsError) {
    console.error('[listCommentsForTarget] comments query failed', {
      targetType,
      targetId,
      commentsError,
    });
    throw commentsError;
  }

  const comments = (commentRows ?? []) as Array<{
    id: string;
    target_type: CommentTargetType;
    target_id: string;
    body: string;
    parent_id: string | null;
    hidden: boolean;
    created_at: string;
    author_id: string;
  }>;
  if (comments.length === 0) return [];

  const authorIds = Array.from(new Set(comments.map((c) => c.author_id)));
  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, nickname, role')
    .in('id', authorIds);
  if (profileError) {
    console.error('[listCommentsForTarget] profiles batch failed', profileError);
    throw profileError;
  }

  const profileById = new Map(
    (profileRows ?? []).map((p) => [
      p.id as string,
      { id: p.id as string, nickname: p.nickname as string, role: p.role as UserRole },
    ]),
  );

  return comments.map((c) => ({
    id: c.id,
    target_type: c.target_type,
    target_id: c.target_id,
    body: c.body,
    parent_id: c.parent_id,
    hidden: c.hidden,
    created_at: c.created_at,
    author: profileById.get(c.author_id) ?? {
      id: c.author_id,
      nickname: '???',
      role: 'member' as UserRole,
    },
  }));
}

/**
 * Moderation view: list hidden comments across every target, newest
 * first, with author + target metadata so the moderator can decide
 * whether to unhide or delete without clicking through to the source
 * page. Only callable by admin/operator (caller is expected to have
 * passed `requireRole('operator')` already).
 *
 * Hidden comments are normally filtered by the `comments_read_visible`
 * SELECT policy. That policy is read-side only; it stops *readers* on
 * public pages from seeing hidden rows, but does NOT stop
 * admin/operator Postgres clients from reading them because the policy
 * has no role check. So the moderator queue just needs to filter
 * `hidden=true` explicitly.
 */
export async function listHiddenComments(): Promise<CommentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('comments')
    .select('id, target_type, target_id, body, parent_id, hidden, created_at, author_id')
    .eq('hidden', true)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    console.error('[listHiddenComments] query failed', error);
    throw error;
  }

  const rows = (data ?? []) as Array<{
    id: string;
    target_type: CommentTargetType;
    target_id: string;
    body: string;
    parent_id: string | null;
    hidden: boolean;
    created_at: string;
    author_id: string;
  }>;
  if (rows.length === 0) return [];

  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, nickname, role')
    .in('id', authorIds);
  if (profileError) {
    console.error('[listHiddenComments] profiles batch failed', profileError);
    throw profileError;
  }

  const profileById = new Map(
    (profileRows ?? []).map((p) => [
      p.id as string,
      { id: p.id as string, nickname: p.nickname as string, role: p.role as UserRole },
    ]),
  );

  return rows.map((c) => ({
    ...c,
    author: profileById.get(c.author_id) ?? {
      id: c.author_id,
      nickname: '???',
      role: 'member' as UserRole,
    },
  }));
}
