-- ============================================================================
-- 0002_comments_and_moderation: Phase 2-E delete/hide policies
-- ============================================================================
-- 0001_init.sql set up the comments table + basic RLS (read-visible,
-- insert-authed, update-own, admin-hide) but omitted DELETE policies on
-- every table. That meant:
--   - the admin deletePost server action silently no-op'd via RLS
--   - operators could not delete comments or answers for moderation
--   - users could not delete their own comments
-- Phase 2-E fills those gaps.
--
-- Idempotent: every policy is dropped-then-created, matching the style
-- of 0001_init.sql so re-running the file via the SQL Editor is safe.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- posts DELETE policies
-- ----------------------------------------------------------------------------
-- Author can delete their own post as long as it isn't already published —
-- published content is part of the public record and should only be removed
-- via moderation. Admin/operator can delete anything for cleanup.

drop policy if exists "posts_delete_own_unpublished" on posts;
create policy "posts_delete_own_unpublished" on posts
  for delete
  using (author_id = auth.uid() and status in ('draft', 'pending', 'rejected'));

drop policy if exists "posts_admin_delete" on posts;
create policy "posts_admin_delete" on posts
  for delete
  using ((select role from profiles where id = auth.uid()) in ('admin', 'operator'));

-- ----------------------------------------------------------------------------
-- answers DELETE policies
-- ----------------------------------------------------------------------------
-- answers_delete_own already exists from 0001_init.sql. Add the admin
-- override so moderators can take down spam without assuming the author role.

drop policy if exists "answers_admin_delete" on answers;
create policy "answers_admin_delete" on answers
  for delete
  using ((select role from profiles where id = auth.uid()) in ('admin', 'operator'));

-- ----------------------------------------------------------------------------
-- comments DELETE policies
-- ----------------------------------------------------------------------------
-- 0001_init.sql has comments_admin_hide (an UPDATE policy that flips the
-- `hidden` flag, which is what the reader pages filter on via
-- comments_read_visible) but no delete policy at all. Two distinct
-- concepts:
--   - *hiding* a comment keeps the row for audit / appeal; readers just
--     don't see it. This is the moderator's usual tool.
--   - *deleting* a comment is what the author uses on their own replies.
-- Users can delete their own; moderators can delete anyone's (rarely needed
-- but useful for illegal content / PII where the row itself must vanish).

drop policy if exists "comments_delete_own" on comments;
create policy "comments_delete_own" on comments
  for delete
  using (author_id = auth.uid());

drop policy if exists "comments_admin_delete" on comments;
create policy "comments_admin_delete" on comments
  for delete
  using ((select role from profiles where id = auth.uid()) in ('admin', 'operator'));
