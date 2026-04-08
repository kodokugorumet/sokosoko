# 04. Tech Stack — 기술 스택

## 4.1 채택 스택 (현재)

| 영역               | 채용                                                   | 비고                                                                                           |
| ------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Framework          | **Next.js 16** (App Router, React 19, Turbopack)       | RSC + i18n + ISR                                                                               |
| Language / Styling | TypeScript 5, Tailwind CSS v4                          | 제로 설정, PostCSS plugin 으로 완결                                                            |
| i18n               | **next-intl v4** (`ja` / `ko`, 일본어 우선)            | App Router 공식 지원, `localePrefix: 'as-needed'`                                              |
| CMS                | **Sanity v5** (Free tier)                              | Studio 는 `*.sanity.studio` 로 분리 호스팅                                                     |
| Hosting (Web)      | **Cloudflare Workers** + `@opennextjs/cloudflare`      | 무료, edge 330+ 도시, 상업적 사용 허용 ([ADR-0002](../adr/0002-hosting-cloudflare-workers.md)) |
| Hosting (Studio)   | **Sanity 호스팅** (`sokosoko.sanity.studio`)           | 무료, Studio 자동 업데이트                                                                     |
| Edge runtime       | `src/middleware.ts` (legacy filename, Edge 동작)       | Next 16 의 `proxy.ts` 는 Node.js 전용이라 사용 불가                                            |
| SNS auto-sync      | X API v2, Bluesky API, Instagram Graph, LINE           | 제3자 SaaS 없이 비용 0                                                                         |
| Auth (Phase 2)     | NextAuth + 이메일 인증 (또는 CF Access / Supabase)     | Phase 2 진입 시 결정                                                                           |
| DB (Phase 2)       | Supabase (Seoul) 또는 CF D1 + Hyperdrive               | Phase 2 진입 시 결정                                                                           |
| Tooling            | pnpm, ESLint, Prettier, Husky, lint-staged, Commitlint | Conventional Commits 강제                                                                      |
| CI                 | GitHub Actions (lint / typecheck / build)              | PR merge 게이트                                                                                |

### 이전 시도와의 차이

- **Wix**: 게시판·회원 등급·SNS 자동 연동에 한계 → 비권장
- **Cloudflare Pages + `next-on-pages`**: 어댑터 deprecated → CF Workers + OpenNext 로 변경 ([ADR-0002](../adr/0002-hosting-cloudflare-workers.md))
- **임베디드 Sanity Studio (`/studio`)**: Worker 번들 16 MiB 초과 → Sanity 호스팅으로 분리

## 4.2 DB 필드 요건 (Phase 2)

와이어프레임 + 카드 컴포넌트로부터 도출. Phase 2 진입 시 Supabase / D1 스키마로 구현 예정.

### posts 테이블 필수 필드

- `id`, `title_jp`, `title_kr`, `body_jp`, `body_kr`
- `category` (enum: `kurasu` / `manabu` / `tabisuru` / `about` / `etc`)
- `subcategory` (예: visa, arc, food, ...)
- `tags` (배열)
- `thumbnail_url` (16:9 권장)
- `author_id` → users.id
- `published_at` (NEW 라벨 판정용 — 7일 이내)
- `view_count` (Top topics TOP 5 정렬용)
- `like_count`
- `is_featured` (boolean — Featured/Recommended Picks 큐레이션용)
- `is_recommended` (boolean — 편집자 추천 슬롯)
- `created_at`, `updated_at`

### users 테이블 필수 필드

- `id`, `email`, `password_hash`
- `nickname_jp`, `nickname_kr`
- `grade` (enum: `guest` / `member` / `verified` / `certified` / `admin`)
- `profile_one_liner` (예: "부산 거주 3년 / ◯◯대학원 재학")
- `avatar_url`
- `agreed_to_terms_at`, `agreed_to_privacy_at` (법적 동의 타임스탬프)

> Phase 1 에서는 `posts` 를 Sanity 스키마로 구현 (`sanity/schemas/post.ts`). Phase 2 에서 회원 시스템 도입 시 별도 DB 추가.
