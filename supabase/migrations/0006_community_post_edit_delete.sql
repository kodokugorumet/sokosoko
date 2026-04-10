-- ============================================================================
-- 0006_community_post_edit_delete: let authors edit/delete their own
-- published posts on member-writable boards
-- ============================================================================
-- 0001_init.sql's `posts_update_own` only allows editing drafts/pending.
-- 0002's `posts_delete_own_unpublished` only allows deleting non-published.
-- Community board posts are created as `status='published'` immediately,
-- so authors couldn't edit or delete them after posting. These policies
-- fix that gap while keeping pillar (operator-only) posts locked to the
-- existing admin-moderate workflow.
--
-- The approach: allow the author to update/delete their own post on any
-- board where `allow_member_post = true`. This way pillar boards
-- (life/study/trip where allow_member_post=false) are unaffected —
-- operators still go through the admin edit page.
-- ============================================================================

-- Author can edit their own published post on member-writable boards.
drop policy if exists "posts_update_own_community" on posts;
create policy "posts_update_own_community" on posts
  for update
  using (
    author_id = auth.uid()
    and (select allow_member_post from boards where slug = board_slug) = true
  )
  with check (
    author_id = auth.uid()
    and (select allow_member_post from boards where slug = board_slug) = true
  );

-- Author can delete their own post (any status) on member-writable boards.
drop policy if exists "posts_delete_own_community" on posts;
create policy "posts_delete_own_community" on posts
  for delete
  using (
    author_id = auth.uid()
    and (select allow_member_post from boards where slug = board_slug) = true
  );
