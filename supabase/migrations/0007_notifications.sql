-- ============================================================================
-- 0007_notifications: in-app notification system
-- ============================================================================
-- Tracks notifications for:
--   - new comment on your post/question
--   - new answer on your question
--   - new helpful vote on your answer
--
-- Each row represents one notification to one recipient. `read` tracks
-- whether the user has seen it. The header 🔔 badge shows the count
-- of unread notifications.
-- ============================================================================

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  kind        text not null check (kind in ('comment', 'answer', 'helpful_vote')),
  -- Reference to the source. For 'comment': the comment id.
  -- For 'answer': the answer id. For 'helpful_vote': the answer id.
  source_id   uuid not null,
  -- Who triggered the notification (the commenter/answerer/voter).
  actor_id    uuid not null references profiles(id) on delete cascade,
  -- The post/question this notification is about (for linking).
  post_id     uuid references posts(id) on delete cascade,
  -- Short preview text (e.g. first 100 chars of the comment body).
  preview     text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_recipient_unread_idx
  on notifications (recipient_id, created_at desc)
  where read = false;

create index if not exists notifications_recipient_all_idx
  on notifications (recipient_id, created_at desc);

-- RLS
alter table notifications enable row level security;

-- Read: recipients can read their own notifications.
drop policy if exists "notifications_read_own" on notifications;
create policy "notifications_read_own" on notifications
  for select using (recipient_id = auth.uid());

-- Insert: any authenticated user can trigger a notification.
-- In practice only server actions create rows, but RLS validates
-- the actor_id matches the caller.
drop policy if exists "notifications_insert_authed" on notifications;
create policy "notifications_insert_authed" on notifications
  for insert with check (actor_id = auth.uid());

-- Update: recipient can mark as read.
drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own" on notifications
  for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Delete: recipient can delete their own notifications.
drop policy if exists "notifications_delete_own" on notifications;
create policy "notifications_delete_own" on notifications
  for delete using (recipient_id = auth.uid());
