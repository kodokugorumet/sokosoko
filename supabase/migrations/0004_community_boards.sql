-- ============================================================================
-- 0004_community_boards: Phase 3-A — seed the 'free' community board
-- ============================================================================
-- Adds the first member-writable article board. More boards (activity,
-- review, etc.) will be added as separate inserts — not schema changes —
-- so future expansions are pure data, no migration required.
--
-- `allow_member_post = true` means any onboarded member can create a
-- post on this board. The existing `posts_insert_allowed_boards` RLS
-- policy from 0001_init.sql already checks this flag, so no new policy
-- is needed.
-- ============================================================================

insert into boards (slug, name_ja, name_ko, description_ja, description_ko, kind, sort_order, allow_member_post)
values (
  'free',
  '自由掲示板',
  '자유 게시판',
  'テーマ不問。日常、質問、雑談、なんでもどうぞ。',
  '주제 제한 없이 자유롭게. 일상, 질문, 잡담, 뭐든지.',
  'article',
  50,
  true
)
on conflict (slug) do nothing;
