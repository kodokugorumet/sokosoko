-- ============================================================================
-- 0008_fix_comment_read_hidden: let admin/operator read hidden comments
-- ============================================================================
-- Bug: 0001_init.sql's `comments_read_visible` policy only allows
-- SELECT where `hidden = false`. This means admin/operator can't read
-- hidden rows either, so:
--   1. The moderation queue at /admin/moderation is always empty
--   2. After an admin hides a comment, it vanishes from everyone's
--      view including the admin's — the "다시 보이기" button is
--      unreachable
--
-- Fix: add a second SELECT policy that lets admin/operator read ALL
-- comments regardless of the `hidden` flag. PostgreSQL OR-combines
-- multiple policies of the same command type, so a row is visible if
-- EITHER `hidden = false` (public) OR the reader is admin/operator.
-- ============================================================================

drop policy if exists "comments_read_admin_all" on comments;
create policy "comments_read_admin_all" on comments
  for select
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'operator')
  );
