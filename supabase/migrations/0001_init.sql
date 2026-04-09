-- ============================================================================
-- 0001_init: Phase 2-B foundation schema
-- ============================================================================
-- Apply via: Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- Idempotent: every CREATE uses `if not exists`, every drop-and-create policy
-- block is wrapped in a `do $$ ... $$` so re-running this file is safe.
--
-- Reference: docs/adr/0004-drop-sanity-for-supabase.md (schema/RLS draft).
-- The shapes here track that ADR; if you change either, update the other.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

do $$ begin
  create type user_role as enum ('member', 'verified', 'operator', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum ('draft', 'pending', 'published', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type comment_target as enum ('post', 'answer');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- profiles — extends auth.users with site-specific fields
-- ----------------------------------------------------------------------------
-- Created automatically on signup via the on_auth_user_created trigger below.
-- The nickname is set during /onboarding (Phase 2-B); until then it's a
-- placeholder so that NOT NULL holds and uniqueness check still kicks in.

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text unique not null,
  role        user_role not null default 'member',
  bio_ja      text,
  bio_ko      text,
  avatar_url  text,
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx on profiles (role) where role <> 'member';

-- Auto-create a profile row when a new user signs up. The placeholder nickname
-- is the first 8 chars of the user id; /onboarding forces them to set a real
-- one before they can post or comment.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, onboarded)
  values (
    new.id,
    'user_' || substr(new.id::text, 1, 8),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- boards — board definitions. Adding a new board is one row insert.
-- ----------------------------------------------------------------------------

create table if not exists boards (
  slug              text primary key,
  name_ja           text not null,
  name_ko           text not null,
  description_ja    text,
  description_ko    text,
  kind              text not null check (kind in ('article', 'qa')),
  sort_order        int not null default 0,
  allow_member_post boolean not null default false,
  created_at        timestamptz not null default now()
);

-- Seed the 4 boards we already have routes for. The 3 pillars are admin-only
-- (article kind), Q&A is member-writable. Activity / review boards will be
-- added as separate inserts in Phase 2-C/D, not here.

insert into boards (slug, name_ja, name_ko, description_ja, description_ko, kind, sort_order, allow_member_post)
values
  ('life',  '釜山ライフ',         '부산 라이프',        '住む — 釜山での日常',           '살다 — 부산에서의 일상',        'article', 10, false),
  ('study', '留学生活・準備',     '유학 생활·준비',     '学ぶ — 語学・進路ガイド',        '배우다 — 어학·진로 가이드',     'article', 20, false),
  ('trip',  '旅行',               '여행',               '旅する — 釜山を楽しむ',          '여행하다 — 부산을 즐기는 법',   'article', 30, false),
  ('qa',    'Q&A',                'Q&A',                'よくある質問と相談',             '자주 묻는 질문과 상담',          'qa',      40, true)
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- posts — articles + Q&A questions sharing one table.
-- ----------------------------------------------------------------------------
-- body_* is JSONB so we can store TipTap document trees directly. answers
-- are a separate table (not posts with target_id) so the Q&A "best answer
-- on top" sort is a clean two-table query.

create table if not exists posts (
  id              uuid primary key default gen_random_uuid(),
  board_slug      text not null references boards(slug),
  author_id       uuid not null references profiles(id) on delete restrict,
  slug            text not null,
  title_ja        text,
  title_ko        text,
  excerpt_ja      text,
  excerpt_ko      text,
  body_ja         jsonb,
  body_ko         jsonb,
  cover_image_url text,
  status          post_status not null default 'draft',
  published_at    timestamptz,
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (board_slug, slug)
);

create index if not exists posts_board_published_idx
  on posts (board_slug, published_at desc)
  where status = 'published';

create index if not exists posts_author_idx on posts (author_id);

-- ----------------------------------------------------------------------------
-- answers — Q&A answers. Trust-tier sort handled by the read query, not here.
-- ----------------------------------------------------------------------------

create table if not exists answers (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid not null references posts(id) on delete cascade,
  author_id       uuid not null references profiles(id) on delete restrict,
  body_ja         jsonb,
  body_ko         jsonb,
  helpful_count   int not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists answers_question_idx
  on answers (question_id, created_at desc);

-- ----------------------------------------------------------------------------
-- comments — polymorphic on posts/answers via (target_type, target_id).
-- ----------------------------------------------------------------------------

create table if not exists comments (
  id          uuid primary key default gen_random_uuid(),
  target_type comment_target not null,
  target_id   uuid not null,
  author_id   uuid not null references profiles(id) on delete restrict,
  body        text not null,
  parent_id   uuid references comments(id) on delete cascade,
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists comments_target_idx
  on comments (target_type, target_id, created_at);

-- ----------------------------------------------------------------------------
-- post_revisions — audit log. Trigger captures the previous state on update.
-- ----------------------------------------------------------------------------

create table if not exists post_revisions (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts(id) on delete cascade,
  title_ja    text,
  title_ko    text,
  body_ja     jsonb,
  body_ko     jsonb,
  edited_by   uuid not null references profiles(id) on delete restrict,
  edited_at   timestamptz not null default now()
);

create index if not exists post_revisions_post_idx
  on post_revisions (post_id, edited_at desc);

create or replace function public.snapshot_post_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only snapshot if anything substantive changed; ignores status-only
  -- transitions (draft → pending → published) which aren't content edits.
  if (old.title_ja is distinct from new.title_ja
      or old.title_ko is distinct from new.title_ko
      or old.body_ja is distinct from new.body_ja
      or old.body_ko is distinct from new.body_ko)
  then
    insert into post_revisions (post_id, title_ja, title_ko, body_ja, body_ko, edited_by)
    values (old.id, old.title_ja, old.title_ko, old.body_ja, old.body_ko, new.author_id);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists posts_snapshot_revision on posts;
create trigger posts_snapshot_revision
  before update on posts
  for each row execute function public.snapshot_post_revision();

-- ============================================================================
-- Row-level security
-- ============================================================================
-- Enable RLS on every user-facing table. Anything reachable via the anon key
-- is gated by these policies, not by app-level checks.

alter table profiles       enable row level security;
alter table boards         enable row level security;
alter table posts          enable row level security;
alter table answers        enable row level security;
alter table comments       enable row level security;
alter table post_revisions enable row level security;

-- ----------------------------------------------------------------------------
-- profiles policies
-- ----------------------------------------------------------------------------
-- Read: all (for nickname/role rendering on posts and answers)
-- Update self: members can edit their own bio/avatar/nickname/onboarded —
--              but NOT their own role. The role column is locked to its
--              current value via the WITH CHECK clause.
-- Update role: admin only.

drop policy if exists "profiles_read_all" on profiles;
create policy "profiles_read_all" on profiles
  for select using (true);

drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self" on profiles
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from profiles where id = auth.uid())
  );

drop policy if exists "profiles_admin_update_role" on profiles;
create policy "profiles_admin_update_role" on profiles
  for update
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- ----------------------------------------------------------------------------
-- boards policies
-- ----------------------------------------------------------------------------

drop policy if exists "boards_read_all" on boards;
create policy "boards_read_all" on boards
  for select using (true);

drop policy if exists "boards_admin_write" on boards;
create policy "boards_admin_write" on boards
  for all
  using ((select role from profiles where id = auth.uid()) = 'admin')
  with check ((select role from profiles where id = auth.uid()) = 'admin');

-- ----------------------------------------------------------------------------
-- posts policies
-- ----------------------------------------------------------------------------

drop policy if exists "posts_read_published" on posts;
create policy "posts_read_published" on posts
  for select using (status = 'published');

drop policy if exists "posts_read_own_draft" on posts;
create policy "posts_read_own_draft" on posts
  for select using (author_id = auth.uid());

drop policy if exists "posts_read_admin_all" on posts;
create policy "posts_read_admin_all" on posts
  for select using (
    (select role from profiles where id = auth.uid()) in ('admin', 'operator')
  );

-- Insert: only on boards that allow member posts, OR if the user is an
-- admin/operator (who can post anywhere). Author must be the caller.
drop policy if exists "posts_insert_allowed_boards" on posts;
create policy "posts_insert_allowed_boards" on posts
  for insert
  with check (
    author_id = auth.uid()
    and (
      coalesce(
        (select allow_member_post from boards where slug = board_slug),
        false
      ) = true
      or (select role from profiles where id = auth.uid()) in ('admin', 'operator')
    )
  );

-- Authors can edit their own drafts and pending posts.
drop policy if exists "posts_update_own" on posts;
create policy "posts_update_own" on posts
  for update
  using (author_id = auth.uid() and status in ('draft', 'pending'))
  with check (author_id = auth.uid());

-- Admin/operator can edit anything (moderation).
drop policy if exists "posts_admin_moderate" on posts;
create policy "posts_admin_moderate" on posts
  for update
  using ((select role from profiles where id = auth.uid()) in ('admin', 'operator'));

-- ----------------------------------------------------------------------------
-- answers policies
-- ----------------------------------------------------------------------------

drop policy if exists "answers_read_all" on answers;
create policy "answers_read_all" on answers for select using (true);

drop policy if exists "answers_insert_authed" on answers;
create policy "answers_insert_authed" on answers
  for insert with check (author_id = auth.uid());

drop policy if exists "answers_update_own" on answers;
create policy "answers_update_own" on answers
  for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "answers_delete_own" on answers;
create policy "answers_delete_own" on answers
  for delete using (author_id = auth.uid());

-- ----------------------------------------------------------------------------
-- comments policies
-- ----------------------------------------------------------------------------

drop policy if exists "comments_read_visible" on comments;
create policy "comments_read_visible" on comments
  for select using (hidden = false);

drop policy if exists "comments_insert_authed" on comments;
create policy "comments_insert_authed" on comments
  for insert with check (author_id = auth.uid());

drop policy if exists "comments_update_own" on comments;
create policy "comments_update_own" on comments
  for update
  using (author_id = auth.uid() and hidden = false)
  with check (author_id = auth.uid());

drop policy if exists "comments_admin_hide" on comments;
create policy "comments_admin_hide" on comments
  for update
  using ((select role from profiles where id = auth.uid()) in ('admin', 'operator'));

-- ----------------------------------------------------------------------------
-- post_revisions policies
-- ----------------------------------------------------------------------------
-- Read: post author + admin/operator. No insert/update/delete via the API —
--       the snapshot trigger inserts as security-definer.

drop policy if exists "revisions_read_author_or_admin" on post_revisions;
create policy "revisions_read_author_or_admin" on post_revisions
  for select using (
    edited_by = auth.uid()
    or (select role from profiles where id = auth.uid()) in ('admin', 'operator')
  );
