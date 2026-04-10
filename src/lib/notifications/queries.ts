import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/posts/queries';

export type NotificationRow = {
  id: string;
  kind: 'comment' | 'answer' | 'helpful_vote';
  source_id: string;
  post_id: string | null;
  preview: string | null;
  read: boolean;
  created_at: string;
  actor: {
    nickname: string;
    role: UserRole;
  };
};

/**
 * Unread notification count for the header 🔔 badge.
 */
export async function countUnreadNotifications(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('read', false);
  if (error) {
    console.error('[countUnreadNotifications] failed', error);
    return 0;
  }
  return count ?? 0;
}

/**
 * All notifications for the /notifications page, newest first.
 * Two-step with batched profile lookup.
 */
export async function listNotifications(userId: string): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from('notifications')
    .select('id, kind, source_id, post_id, preview, read, created_at, actor_id')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    console.error('[listNotifications] failed', error);
    throw error;
  }

  const notifs = (rows ?? []) as Array<{
    id: string;
    kind: 'comment' | 'answer' | 'helpful_vote';
    source_id: string;
    post_id: string | null;
    preview: string | null;
    read: boolean;
    created_at: string;
    actor_id: string;
  }>;
  if (notifs.length === 0) return [];

  const actorIds = Array.from(new Set(notifs.map((n) => n.actor_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, role')
    .in('id', actorIds);

  const profileById = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      { nickname: p.nickname as string, role: p.role as UserRole },
    ]),
  );

  return notifs.map((n) => ({
    id: n.id,
    kind: n.kind,
    source_id: n.source_id,
    post_id: n.post_id,
    preview: n.preview,
    read: n.read,
    created_at: n.created_at,
    actor: profileById.get(n.actor_id) ?? { nickname: '???', role: 'member' as UserRole },
  }));
}
