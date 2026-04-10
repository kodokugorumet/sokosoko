-- ============================================================================
-- 0005_answer_votes: Phase 3 — Q&A answer helpful votes
-- ============================================================================
-- Tracks which user voted helpful on which answer. One vote per user per
-- answer, enforced by the unique index. The `helpful_count` on the
-- `answers` table is denormalised for sort performance — it's incremented/
-- decremented by the toggle vote server action, not a trigger, because
-- trigger-based counting on a table with RLS is fragile.
-- ============================================================================

create table if not exists answer_votes (
  answer_id uuid not null references answers(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (answer_id, user_id)
);

-- RLS
alter table answer_votes enable row level security;

-- Read: anyone can see who voted (needed for the "did I already vote?" check).
drop policy if exists "answer_votes_read_all" on answer_votes;
create policy "answer_votes_read_all" on answer_votes
  for select using (true);

-- Insert: any authenticated user can vote.
drop policy if exists "answer_votes_insert_authed" on answer_votes;
create policy "answer_votes_insert_authed" on answer_votes
  for insert with check (user_id = auth.uid());

-- Delete: a user can un-vote their own vote.
drop policy if exists "answer_votes_delete_own" on answer_votes;
create policy "answer_votes_delete_own" on answer_votes
  for delete using (user_id = auth.uid());
