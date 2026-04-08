# ADR-0003: 호스팅 — Vercel (Hobby → Pro 단계 전환)

- Status: Accepted
- Date: 2026-04-08
- Supersedes: [ADR-0002](./0002-hosting-cloudflare-workers.md) (Cloudflare Workers + Sanity 호스팅 Studio)

## Context

ADR-0002 에서 Cloudflare Workers + `@opennextjs/cloudflare` 를 채택했지만, 첫 배포 시도에서 다음 문제들이 드러났다.

1. **Worker 크기 한계 초과**: 임베디드 Sanity Studio 가 약 16.9 MiB 의 worker 번들을 만들어 CF 의 3 MiB (Free) / 10 MiB (Paid) 한도를 모두 초과. Studio 를 분리해도 OpenNext 가 자동으로 포함시키는 `@vercel/og` (resvg.wasm 등) 가 추가 ~2 MiB.
2. **Edge runtime 제약**: Next.js 16 의 새 `proxy.ts` 가 Node.js 전용이라 CF Workers 에서 동작 불가. 레거시 `middleware.ts` 파일명으로 우회는 가능하지만 deprecation 경고가 발생.
3. **OpenNext 의 베타스러움**: Windows 에서 symlink 권한 문제로 로컬 빌드 불가, 일부 Next.js 16 기능 (PPR, Server Actions 일부) 이 미묘하게 깨짐.
4. **`next/image` 자동 최적화 손실**: CF 에서는 별도 비용이거나 정적 원본 서빙. SNS 공유 시 OG 이미지 자동 생성 (`@vercel/og`) 도 어려움.
5. **Vercel Hobby 약관 재해석**: "상업적 사용 금지" 의 실제 적용 범위는 _사이트 자체가 매출/광고를 발생시키는 경우_ 로, **Phase 1 의 비영리 정보 블로그 + 모임 안내** 는 약관 OK. 광고/멤버십이 실제로 도입되는 Phase 2 후반에 Pro ($20/월) 로 업그레이드하면 됨.

## Decision

세 가지 변경을 한꺼번에 적용한다:

### 1. Hosting: Cloudflare Workers → **Vercel (Hobby → Pro 단계 전환)**

- **Phase 1 (~ 6개월)**: Vercel **Hobby** 무료 — 비영리 정보 블로그 + 모임 안내로 약관 OK
- **Phase 2 광고/멤버십 도입 시점**: **Pro ($20/월)** 로 업그레이드. 그 시점이면 트래픽도 정당화됨
- 1st party Next.js 16 지원 → `proxy.ts`, PPR, Server Actions, ISR, `next/image`, `@vercel/og` 모두 즉시 동작

### 2. Edge middleware: `src/middleware.ts` → **`src/proxy.ts` (Next 16 표준)**

- Vercel 은 `proxy.ts` 를 Node.js 런타임에서 실행하므로, Sanity client 같은 Node 모듈 의존이 자유로움
- next-intl 미들웨어가 Node 런타임에서 동작 → Edge 제약 없음

### 3. Sanity Studio: **임베디드 (`/studio`) 그대로 유지**

- Vercel 은 worker 크기 제한이 없으므로 (function 크기 50 MB 까지) 임베디드 Studio 그대로 OK
- `sokosoko.com/studio` 단일 도메인 → 작가 UX 통일
- `pnpm sanity deploy` 같은 별도 배포 절차 불필요

## Alternatives considered

| 옵션                                  | Phase 1 비용 | 광고/멤버십 시점      | Studio    | 결정                            |
| ------------------------------------- | ------------ | --------------------- | --------- | ------------------------------- |
| **Vercel Hobby → Pro 단계 전환**      | $0           | $20/월 (Phase 2 후반) | 임베디드  | ✅ 채택                         |
| Cloudflare Workers + Sanity 호스팅    | $0           | $0                    | 분리 필요 | ❌ (worker size, OpenNext 제약) |
| Cloudflare Workers Paid + Studio 분리 | $5/월        | $5/월                 | 분리 필요 | ❌ (여전히 OpenNext 제약)       |
| Self-hosted (미니 PC)                 | 전기료       | 전기료                | 임베디드  | ❌ (운영 부담, SSL 직접 관리)   |

## Consequences

### 장점 (+)

- **Next.js 16 의 모든 기능 즉시 동작** — 1st party 지원
- **`@vercel/og` 무료** — 블로그 글마다 동적 OG 이미지 자동 생성 (SNS 공유 클릭률 직결)
- **`next/image` 자동 최적화 무료** — 1,000 장/월 (Phase 1 콘텐츠 페이스로 1년차에도 ~60장 수준)
- **Studio 임베디드 유지** — `sokosoko.com/studio`, 작가 UX 통일, 별도 배포 0
- **Windows 에서 로컬 빌드 정상 동작** — symlink 문제 없음
- **Vercel CLI / 대시보드 DX 가 압도적** — 환경변수, preview URL, 로그가 한 화면
- **Phase 2 마이그레이션이 필요해지면 Pro 로 클릭 한 번** — 코드 변경 0
- **PR preview URL 자동 생성** — 디자이너 / 운영진 리뷰가 매우 매끈

### 단점 (−)

- **Phase 2 후반 (광고/멤버십 시점) 부터 $20/월** — 그 시점이면 트래픽 / 가치 정당화 가능
- **벤더 락인 약함** — Vercel 의 일부 기능 (Edge Functions, KV, Postgres) 에 의존하면 마이그레이션 비용 증가. 의존성 최소화 원칙 유지.
- **Region 기반 (icn1 = 서울)** — CF Workers 의 글로벌 edge 보다 100ms 내외 느림. 한일 사용자 기준 50-150ms 로 충분
- **무료 대역폭 100 GB/월** — 바이럴 폭주 시 초과분 과금 가능. Phase 1 트래픽 예상치는 한참 아래

## Implementation notes

### 제거되는 것

- `wrangler.jsonc`, `open-next.config.ts`, `public/_headers`, `cloudflare-env.d.ts`
- `@opennextjs/cloudflare`, `wrangler` dependencies
- `package.json` scripts: `preview`, `deploy`, `cf-typegen`
- `.gitignore`: `.open-next`, `.wrangler`, `.dev.vars` 항목
- `eslint.config.mjs` / `.prettierignore`: CF 관련 ignore

### 변경되는 것

- `src/middleware.ts` → `src/proxy.ts` (Next 16 표준 파일명, Node 런타임)
- README, `docs/plan/04-tech-stack.md`, `docs/plan/00-overview.md`, `docs/plan/02-roadmap.md`, `docs/plan/06-operations.md` 업데이트

### 추가되는 것

- `docs/runbooks/vercel-deploy.md` — Vercel 배포 절차

### 환경변수 (Vercel 대시보드에 등록)

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET=production`
- `NEXT_PUBLIC_SANITY_API_VERSION=2025-01-01`

## Phase 2 / Phase 3 인프라 (예정)

회원 시스템 도입 시 추가 검토:

- **Auth**: NextAuth + 이메일 인증, 또는 Clerk / Supabase Auth
- **DB**: Supabase (Seoul region) 또는 Vercel Postgres / Neon
- **Storage**: Sanity 자체 CDN (이미지) + Vercel Blob (필요 시)
- **Cron**: Vercel Cron Jobs (SNS 자동 동기화 트리거)
- **광고/멤버십 도입 시점**: Vercel Pro 업그레이드 ($20/월) — 약관 제약 해제
