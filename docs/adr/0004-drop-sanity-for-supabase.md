# ADR-0004: Sanity 완전 제거, Supabase 단일 스택으로 전환

- Status: **Implemented** (Phase 2-F, PR #60, 2026-04-10)
- Date: 2026-04-09
- Supersedes: [ADR-0001](./0001-tech-stack.md) 의 "Sanity = 콘텐츠 모델 + CMS" 섹션
- Implementation PRs:
  - #46 Phase 2-B: Supabase 기반 (auth, profiles, onboarding, migration 0001)
  - #49 Phase 2-C: TipTap 에디터 + 관리자 게시글 CRUD + /p/[id] 공개 페이지
  - #51 Phase 2-D: Q&A + 유저 답변 + 신뢰 뱃지 정렬
  - #59 Phase 2-E: 댓글 + 모더레이션 큐 (migration 0002)
  - #60 Phase 2-F: Sanity 백엔드 완전 제거, 모든 public 페이지 Supabase 전환
  - #62 Phase 2-E 후속: per-answer comments

## Context

ADR-0001 에서는 Sanity 를 "양국어 에디토리얼 콘텐츠 모델 + 임베디드 Studio" 로 채택했다. Phase 1 의 3 개 pillar (life/study/trip) + Q&A 까지 Sanity 로 구현했고 (PR #12–#22), Studio 는 `/studio` 에 임베디드 배포된 상태.

그런데 Phase 1 실사용 전 단계에서 요구사항이 달라졌다:

1. **UGC 중심**: Q&A 는 유저도 질문·답변을 작성할 수 있어야 한다. 활동 게시판, 후기 게시판 등 **여러 게시판** 이 추가될 예정.
2. **신뢰 뱃지 시스템**: 같은 답변이라도 "운영자가 쓴 답변", "신뢰 유저가 쓴 답변", "일반 유저가 쓴 답변" 을 **정렬 순서 + 이모지 뱃지** 로 구분해야 함.
3. **운영자 수**: 2–3 명 예상. Sanity Free 의 3-user 한도 경계선.
4. **현재 콘텐츠 0 편**: 운영자가 아직 첫 글을 쓰기 전. **마이그레이션 비용이 최소인 시점**.

위 요구사항들은 Sanity 가 잘 하는 영역 (에디토리얼 팀의 구조화된 CMS) 과 겹치지 않는다. Sanity 는 UGC 플랫폼이 아니며, Auth/RLS/신뢰 뱃지/댓글 시스템을 전부 별도 (Supabase) 로 만들어야 하는데, 그러면 **두 개의 데이터 소스가 공존하는 복잡도** 를 안게 된다.

## Decision

**Sanity 를 완전히 제거하고 Supabase 단일 스택으로 전환한다.**

- Auth, DB, Storage, Realtime 을 모두 Supabase 로 통합
- 공식 가이드 콘텐츠 (life/study/trip) 도 Supabase `posts` 테이블에 저장, `role='admin'` 유저가 작성한 것을 "공식" 으로 표시
- 신뢰 레벨은 `profiles.role` enum 으로 구분 (`admin` | `operator` | `verified` | `member`)
- 게시판은 `boards` 테이블로 추상화 → 나중에 게시판 추가는 row 1 개만 insert 하면 됨
- 에디터 UI 는 Next.js 앱 내에 직접 구현 (TipTap 기반)

## Alternatives considered

| 옵션                         | 장점                                | 단점                                                         | 결정    |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------------ | ------- |
| **A. Supabase 단일 스택**    | 단순, 확장 쉬움, UGC/auth 기반      | 8 일 마이그레이션, 에디터 UI 직접 구현                       | ✅ 채택 |
| B. 하이브리드 (Sanity + SB)  | 기존 Sanity 투자 보전               | 두 스택 학습 부담, 공식/UGC 구조 차이, Sanity 3-user 제한    | ❌      |
| C. Sanity 유지 + 게시판만 SB | 최소 변경                           | "Q&A 유저 답변" 요구 미충족, Sanity 가 점점 곁다리 됨        | ❌      |
| D. Sanity Growth ($15/seat)  | Sanity 그대로 + 운영자 3 명 초과 OK | 월 $45+ 고정비, 여전히 신뢰 뱃지 시스템을 별도로 만들어야 함 | ❌      |

## Consequences

### 장점 (+)

- **단일 데이터 모델** — auth, 콘텐츠, 댓글, 반응이 모두 한 DB. join + RLS 로 신뢰 뱃지 시스템이 자연스러움
- **게시판 확장이 row 추가만으로** 가능 — 활동/후기/기타 게시판 추가 시 스키마 변경 불필요
- **운영자 수 제한 없음** — Supabase Free 는 무제한 유저 (Auth), 500 MB DB, 1 GB Storage, 2 GB 전송/월
- **Cost** — Supabase Free 티어가 Phase 1 트래픽을 감당. Pro ($25/월) 는 Phase 2 후반에 고려
- **서울 region** — 한일 사용자 latency 최적 (Sanity 는 글로벌 CDN 이지만 write 는 US/EU)
- **Real-time 기본 제공** — 댓글, 알림, 좋아요 카운트 등이 Supabase Realtime 으로 자연스러움
- **Postgres Full-text search** — 기존 GROQ `match` 보다 훨씬 강력 (tsvector, 한국어/일본어 분석기)
- **RLS 로 권한 분리** — SQL 에 "유저는 자기 글만 수정 가능, admin 은 모든 글 편집 가능" 같은 규칙을 쓸 수 있음. 서버 코드가 단순해짐
- **벤더 락인 약함** — Supabase 는 오픈소스 (self-host 가능), Postgres 표준 준수. Sanity 에 비해 lock-in 훨씬 낮음

### 단점 (−)

- **8 일 마이그레이션 비용** — 기존 Sanity 통합 코드를 대체하는 작업 (아래 Implementation notes 참조)
- **Sanity Studio 의 에디터 UX 를 잃음** — TipTap 으로 대체. TipTap 은 Notion/Linear 수준의 rich text 에디터지만 초기 통합 비용 있음
- **Portable Text 구조 손실** — JSON 기반 TipTap doc 으로 대체. 검색 인덱싱/diff 모두 가능하지만 1:1 호환 아님
- **Real-time collaborative editing 을 잃음** — 운영자가 같은 글을 동시 편집하는 시나리오는 실제로 없으므로 허용 가능
- **Revision history 직접 구현** — `post_revisions` 테이블 + trigger 로 대체 (간단)

### 결정적 타이밍 요인

**Sanity 에 콘텐츠가 0 편** 인 지금이 마이그레이션 비용 최소 시점. 일주일만 지나 운영자가 첫 글을 쓰면 콘텐츠 이전 작업이 추가된다. 지금이 가장 싸다.

## Implementation notes (Phase 2-A → 2-E)

### 제거되는 것 (한 PR 로)

- `sanity/` 디렉터리 전체 (schemas, lib, config, env, cli, structure)
- `src/app/studio/[[...tool]]/` — 임베디드 Studio 라우트
- `src/app/api/revalidate/route.ts` — Sanity webhook (또는 Supabase realtime/cron 으로 대체)
- `src/app/api/syndicate/route.ts` — 트리거 소스만 변경 (Supabase → SNS)
- Deps: `next-sanity`, `sanity`, `@sanity/image-url`, `@sanity/vision`, `@sanity/webhook`, `styled-components` (Studio 전용)
- Sanity 관련 env vars: `NEXT_PUBLIC_SANITY_*`, `SANITY_API_READ_TOKEN`, `SANITY_REVALIDATE_SECRET`, `SANITY_SYNDICATE_SECRET`

### 유지되는 것 (재사용)

- next-intl i18n 설정, Header/Footer, 디자인 토큰, 폰트
- 에러/not-found 바운더리 (PR #44 에서 방금 수정)
- ShareButtons, 읽기 시간 계산
- Sitemap, robots, LHCI workflow
- GSC 인증, GA4
- SNS syndication X 어댑터 (트리거 소스만 변경)

### 새로 추가되는 것

- Supabase 클라이언트 + SSR 통합 (`@supabase/ssr`)
- Email magic link auth (`/login`, `/signup`, 콜백 라우트)
- DB 스키마 (아래 §스키마 초안)
- RLS 정책 (아래 §RLS 초안)
- TipTap 에디터 통합 (`/[board]/new`, `/[board]/[slug]/edit`)
- 관리자 페이지 (`/admin/moderation`, `/admin/users`)
- `docs/runbooks/supabase-setup.md`

### 스키마 초안

```sql
-- profiles: auth.users 의 확장. 트리거로 가입 시 자동 생성.
create type user_role as enum ('member', 'verified', 'operator', 'admin');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text unique not null,
  role user_role not null default 'member',
  bio_ja text,
  bio_ko text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- boards: 게시판 정의. 추가는 row insert 만.
create table boards (
  slug text primary key,                 -- 'life', 'study', 'trip', 'qa', 'activity', ...
  name_ja text not null,
  name_ko text not null,
  description_ja text,
  description_ko text,
  kind text not null check (kind in ('article', 'qa')),
  sort_order int not null default 0,
  allow_member_post boolean not null default false,  -- life/study/trip 는 false, qa/활동 는 true
  created_at timestamptz not null default now()
);

-- posts: 아티클 + Q&A 질문 공용. body 는 TipTap JSON.
create type post_status as enum ('draft', 'pending', 'published', 'rejected');

create table posts (
  id uuid primary key default gen_random_uuid(),
  board_slug text not null references boards(slug),
  author_id uuid not null references profiles(id),
  slug text not null,
  title_ja text,
  title_ko text,
  excerpt_ja text,
  excerpt_ko text,
  body_ja jsonb,           -- TipTap JSON
  body_ko jsonb,
  cover_image_url text,
  status post_status not null default 'draft',
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (board_slug, slug)
);
create index posts_board_published_idx on posts (board_slug, published_at desc)
  where status = 'published';

-- answers: Q&A 의 답변. posts 에 answer 타입을 섞는 대신 분리 (정렬 단순).
create table answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body_ja jsonb,
  body_ko jsonb,
  helpful_count int not null default 0,
  created_at timestamptz not null default now()
);
create index answers_question_idx on answers (question_id, created_at desc);

-- comments: posts/answers 공용. polymorphic target.
create type comment_target as enum ('post', 'answer');
create table comments (
  id uuid primary key default gen_random_uuid(),
  target_type comment_target not null,
  target_id uuid not null,
  author_id uuid not null references profiles(id),
  body text not null,
  parent_id uuid references comments(id) on delete cascade,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_target_idx on comments (target_type, target_id, created_at);

-- post_revisions: 감사 로그. update 시 트리거가 이전 버전을 여기에 insert.
create table post_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  title_ja text,
  title_ko text,
  body_ja jsonb,
  body_ko jsonb,
  edited_by uuid not null references profiles(id),
  edited_at timestamptz not null default now()
);
```

### RLS 초안

```sql
alter table profiles enable row level security;
alter table boards enable row level security;
alter table posts enable row level security;
alter table answers enable row level security;
alter table comments enable row level security;
alter table post_revisions enable row level security;

-- profiles: 모두가 읽음, 본인만 수정, role 변경은 admin 만
create policy "profiles_read_all" on profiles for select using (true);
create policy "profiles_update_self" on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
create policy "profiles_admin_role" on profiles for update
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- boards: 모두가 읽음, admin 만 수정
create policy "boards_read_all" on boards for select using (true);
create policy "boards_admin_write" on boards for all
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- posts: published 는 모두 / draft·pending 은 본인+admin / insert 는 board 정책에 따라
create policy "posts_read_published" on posts for select
  using (status = 'published');
create policy "posts_read_own_draft" on posts for select
  using (author_id = auth.uid());
create policy "posts_read_admin_all" on posts for select
  using ((select role from profiles where id = auth.uid()) in ('admin', 'operator'));
create policy "posts_insert_allowed_boards" on posts for insert
  with check (
    author_id = auth.uid() and (
      (select allow_member_post from boards where slug = board_slug) = true
      or (select role from profiles where id = auth.uid()) in ('admin', 'operator')
    )
  );
create policy "posts_update_own" on posts for update
  using (author_id = auth.uid() and status in ('draft', 'pending'))
  with check (author_id = auth.uid());
create policy "posts_admin_moderate" on posts for update
  using ((select role from profiles where id = auth.uid()) in ('admin', 'operator'));

-- answers: 모두가 읽음 / 인증된 유저가 쓸 수 있음 / 본인만 수정
create policy "answers_read_all" on answers for select using (true);
create policy "answers_insert_authed" on answers for insert
  with check (author_id = auth.uid());
create policy "answers_update_own" on answers for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());

-- comments: 비슷한 패턴
create policy "comments_read_visible" on comments for select using (hidden = false);
create policy "comments_insert_authed" on comments for insert
  with check (author_id = auth.uid());
create policy "comments_update_own" on comments for update
  using (author_id = auth.uid() and hidden = false);
create policy "comments_admin_hide" on comments for update
  using ((select role from profiles where id = auth.uid()) in ('admin', 'operator'));
```

### 정렬: 신뢰 뱃지 기반

Q&A 답변 목록을 `role` 기반으로 정렬:

```sql
select a.*, p.nickname, p.role
from answers a
join profiles p on p.id = a.author_id
where a.question_id = $1
order by
  case p.role
    when 'admin' then 0
    when 'operator' then 1
    when 'verified' then 2
    else 3
  end,
  a.helpful_count desc,
  a.created_at asc;
```

닉네임 앞 이모지:

```tsx
const ROLE_BADGE: Record<UserRole, string> = {
  admin: '👑',
  operator: '🏅',
  verified: '✅',
  member: '',
};
```

### Auth flow

- Email magic link (no password) — Supabase Auth 기본 제공
- `/login` → 이메일 입력 → 매직링크 발송 → 콜백 → 쿠키 세션
- 신규 가입자는 `profiles` 테이블에 자동 row 생성 (on_auth_user_created trigger)
- 닉네임은 가입 직후 `/onboarding` 페이지에서 1 회 설정

### 마이그레이션 PR 순서

- **Phase 2-A** (`docs/adr-0004-drop-sanity-for-supabase`): 이 문서 (현재 PR)
- **Phase 2-B** (`feat/supabase-foundation`): @supabase/ssr 통합 + auth + profiles 스키마 + /login
- **Phase 2-C** (`feat/posts-and-boards`): boards/posts 테이블 + TipTap 에디터 + 목록/상세 페이지
- **Phase 2-D** (`feat/qa-with-answers`): Q&A 답변 시스템 + 신뢰 뱃지 정렬
- **Phase 2-E** (`feat/comments-and-moderation`): 댓글 + 모더레이션 큐
- **Phase 2-F** (`chore/remove-sanity`): Sanity 코드 전체 삭제 + 라우팅 정리 + 문서 업데이트

각 Phase 가 독립 PR 이라 롤백 가능. Phase 2-B ~ 2-E 동안 Sanity 는 여전히 작동 중이고, Phase 2-F 에서만 완전히 끊어짐.

## 운영자 액션 (Claude 가 못 함)

1. **Supabase 프로젝트 생성**: https://supabase.com → New project
   - Region: **Northeast Asia (Seoul) / `ap-northeast-2`**
   - Project name: `sokosoko`
   - DB password: 안전한 값 (1Password 등에 저장)
   - Pricing: Free
2. **환경변수 3 개를 Vercel 에 등록**:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project settings → API)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (같은 페이지)
   - `SUPABASE_SERVICE_ROLE_KEY` (같은 페이지, 서버 전용)
3. **SQL Editor 에서 스키마/RLS 적용** — Phase 2-B PR 에 첨부되는 migration 파일 실행
4. **첫 관리자 계정 생성**: 일반 가입 후 SQL 로 `update profiles set role='admin' where id = ...` (닭과 달걀 문제 해결)
5. **(Phase 2-F 이후) Vercel 의 Sanity env vars 삭제**

## 관련 변경

- [ADR-0001](./0001-tech-stack.md) 의 "Sanity = 콘텐츠 모델 + CMS" 섹션이 무효화됨
- `docs/specs/00-requirements.md`, `01-functional.md`, `02-non-functional.md` 의 Sanity 관련 문장은 Phase 2-F 에서 일괄 업데이트
- `docs/runbooks/sanity-webhook.md`, `content-authoring.md`, `sns-syndication.md` 의 Sanity 언급 부분은 Phase 2-F 에서 수정
