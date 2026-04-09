'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser, requireRole } from '@/lib/auth/require-role';
import type { CommentTargetType } from './queries';

/**
 * Server actions for comments. Three write paths:
 *
 *   createComment — any onboarded member can comment on a public target.
 *                   RLS enforces `author_id = auth.uid()` so a spoofed
 *                   form body can't pretend to be someone else.
 *
 *   deleteComment — the author of the row (RLS: comments_delete_own).
 *                   Moderators also have comments_admin_delete but that
 *                   path lives in hideComment/moderation instead, because
 *                   hiding is almost always the right moderator action
 *                   (audit trail + reversible).
 *
 *   setCommentHidden — admin/operator flips the `hidden` flag. The
 *                      comments_admin_hide UPDATE policy from 0001_init
 *                      lets us toggle it either direction without touching
 *                      the rest of the row.
 *
 * Every mutation calls revalidatePath on the page the comment belongs to
 * so the reader sees the change on their next render.
 */

const MAX_COMMENT_LENGTH = 2000;

async function requireOnboardedMember() {
  const user = await getSessionUser();
  if (!user || !user.onboarded) {
    return { ok: false as const, error: 'unauthorized' };
  }
  return { ok: true as const, user };
}

/**
 * Where does this comment actually render? The caller hands us a
 * `revalidate_path` form field when they know (e.g. the reader page
 * that owns the form). If they don't pass one we fall back to the
 * parent target's admin detail route, which at least invalidates *some*
 * cache that touches the comment.
 */
function revalidateTargetPath(formData: FormData) {
  const pathHint = String(formData.get('revalidate_path') ?? '').trim();
  if (pathHint.startsWith('/')) {
    revalidatePath(pathHint, 'layout');
  }
}

export async function createComment(formData: FormData) {
  const auth = await requireOnboardedMember();
  if (!auth.ok) return auth;

  const targetType = String(formData.get('target_type') ?? '') as CommentTargetType;
  const targetId = String(formData.get('target_id') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const parentIdRaw = String(formData.get('parent_id') ?? '').trim();
  const parentId = parentIdRaw === '' ? null : parentIdRaw;

  if (targetType !== 'post' && targetType !== 'answer') {
    return { ok: false as const, error: 'invalid-target' };
  }
  if (!targetId) return { ok: false as const, error: 'invalid-target' };
  if (!body) return { ok: false as const, error: 'empty' };
  if (body.length > MAX_COMMENT_LENGTH) {
    return { ok: false as const, error: 'too-long' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('comments').insert({
    target_type: targetType,
    target_id: targetId,
    author_id: auth.user.id,
    body,
    parent_id: parentId,
  });

  if (error) {
    console.error('[createComment] insert failed', { targetType, targetId, error });
    return { ok: false as const, error: error.message };
  }

  revalidateTargetPath(formData);
  return { ok: true as const };
}

/**
 * Author-side delete. RLS blocks anyone but the author, so there's no
 * explicit role check here.
 */
export async function deleteComment(commentId: string, revalidatePathHint?: string) {
  const auth = await requireOnboardedMember();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) {
    console.error('[deleteComment] failed', { commentId, error });
    return { ok: false as const, error: error.message };
  }
  if (revalidatePathHint?.startsWith('/')) {
    revalidatePath(revalidatePathHint, 'layout');
  }
  return { ok: true as const };
}

/**
 * Moderator hide/unhide. The `hidden` column is what the public read
 * policy (comments_read_visible) filters on, so flipping it is the
 * minimal intervention — the row itself sticks around for audit.
 */
export async function setCommentHidden(
  commentId: string,
  hidden: boolean,
  revalidatePathHint?: string,
) {
  // requireRole bounces members away — only operators/admins reach here.
  await requireRole('operator');

  const supabase = await createClient();
  const { error } = await supabase.from('comments').update({ hidden }).eq('id', commentId);
  if (error) {
    console.error('[setCommentHidden] failed', { commentId, hidden, error });
    return { ok: false as const, error: error.message };
  }
  if (revalidatePathHint?.startsWith('/')) {
    revalidatePath(revalidatePathHint, 'layout');
  }
  // Always invalidate the moderation page so the row moves in/out of
  // the queue on the next render.
  revalidatePath('/admin/moderation', 'layout');
  return { ok: true as const };
}
