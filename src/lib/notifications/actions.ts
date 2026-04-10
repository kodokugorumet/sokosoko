'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/require-role';

/**
 * Create a notification. Called from other server actions (createComment,
 * createAnswer, toggleHelpfulVote) when they want to notify the
 * content owner.
 *
 * This is a "best effort" helper — if it fails (e.g. RLS blocks, or
 * the recipient is the same as the actor), it logs and returns silently.
 * Never blocks the parent action.
 */
export async function createNotification({
  recipientId,
  kind,
  sourceId,
  actorId,
  postId,
  preview,
}: {
  recipientId: string;
  kind: 'comment' | 'answer' | 'helpful_vote';
  sourceId: string;
  actorId: string;
  postId?: string | null;
  preview?: string | null;
}) {
  // Don't notify yourself.
  if (recipientId === actorId) return;

  try {
    const supabase = await createClient();
    await supabase.from('notifications').insert({
      recipient_id: recipientId,
      kind,
      source_id: sourceId,
      actor_id: actorId,
      post_id: postId ?? null,
      preview: preview?.slice(0, 100) ?? null,
    });
  } catch (err) {
    console.error('[createNotification] failed (non-blocking)', { kind, sourceId, err });
  }
}

/**
 * Mark all unread notifications as read for the current user.
 */
export async function markAllRead() {
  const user = await getSessionUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('recipient_id', user.id)
    .eq('read', false);

  revalidatePath('/notifications', 'layout');
  revalidatePath('/', 'layout'); // header badge
}

/**
 * Mark a single notification as read.
 */
export async function markOneRead(notificationId: string) {
  const user = await getSessionUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('recipient_id', user.id);
}
