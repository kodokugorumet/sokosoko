# ADR-0002: 호스팅 — Cloudflare Workers + Sanity 호스팅 Studio

- Status: **Superseded by [ADR-0003](./0003-hosting-vercel.md)**
- Date: 2026-04-08
- Supersedes: ADR-0001 의 "Hosting" 행 (Cloudflare Pages)
- Superseded by: [ADR-0003](./0003-hosting-vercel.md) (2026-04-08, 같은 날 — 첫 배포 시도에서 Worker 크기 한계 등이 드러나 Vercel 로 전환)

## Context

ADR-0001 에서는 호스팅으로 **Cloudflare Pages** 를 채택했지만, 다음 사실들이 드러나 재검토가 필요해졌다.

1. **`@cloudflare/next-on-pages` 가 deprecated** 되었고, Next.js 16 의 공식 권장 경로는 **`@opennextjs/cloudflare` (OpenNext)** 이다.
2. OpenNext 의 빌드 산출물은 **Cloudflare Workers** 에 배포되며, Pages 가 아니다.
3. Next.js 16 의 새 `proxy.ts` 파일 컨벤션은 **Node.js 런타임 전용**이라 CF Workers (Edge) 에서 동작하지 않는다.
4. Sanity v5 의 임베디드 Studio (`/studio`) 를 Next.js 앱에 포함시키면, Worker 번들이 약 **16.9 MiB** 가 되어 CF Workers 의 **3 MiB (Free) / 10 MiB (Paid) 한도** 를 초과한다.
5. 소코소코는 Phase 2 이후 **광고 / 멤버십 / 유료 콘텐츠** 가 계획되어 있다. **Vercel Hobby 는 약관상 상업적 사용을 금지**하고, 회피하려면 Vercel Pro ($20/월) 가 강제된다.

## Decision

세 가지 변경을 한꺼번에 적용한다:

### 1. Hosting (Web): Cloudflare Pages → **Cloudflare Workers + `@opennextjs/cloudflare`**

- 어댑터: `@opennextjs/cloudflare@^1.18.0`
- 빌드: `pnpm exec opennextjs-cloudflare build` → `.open-next/worker.js` + `.open-next/assets/`
- 배포: `pnpm exec opennextjs-cloudflare deploy` (내부적으로 `wrangler deploy`)
- 빌드 환경: **Cloudflare Workers Builds (Linux, Git 연동)** 또는 GitHub Actions ubuntu-latest. 로컬 Windows 는 OpenNext 의 symlink 권한 문제로 빌드 불가 → WSL 권장.

### 2. Edge middleware: `proxy.ts` → **`src/middleware.ts` (legacy filename)**

- Next.js 16 의 `proxy.ts` 는 Node.js 런타임 전용이라 CF Workers 에서 동작 불가.
- 레거시 `middleware.ts` 파일명은 Next 가 deprecation 경고를 띄우긴 하지만, **Edge 런타임으로 빌드**되어 CF Workers 와 호환된다.
- next-intl 미들웨어가 모든 요청에서 동작해야 하므로 이 결정은 필수.

### 3. Sanity Studio: 임베디드 → **Sanity 호스팅 (`*.sanity.studio`)**

- Studio 가 import 하는 `sanity` + `@sanity/vision` + `styled-components` + 모든 스키마 에디터 UI 가 약 14-15 MB.
- 이를 Next.js Worker 번들에서 제외하기 위해 **`src/app/studio/[[...tool]]/` 라우트를 제거**하고, 대신 `pnpm sanity deploy` 로 Sanity 가 무료 호스팅하는 `https://sokosoko.sanity.studio` 를 사용한다.
- 같은 dataset 을 보므로 콘텐츠는 100% 동일.

## Alternatives considered

| 옵션                                | 비용   | 상업 사용   | 한일 latency | 결정                   |
| ----------------------------------- | ------ | ----------- | ------------ | ---------------------- |
| **CF Workers + Sanity 호스팅**      | $0     | ✅          | 10-30 ms     | ✅ 채택                |
| Vercel Hobby (임베디드 Studio 유지) | $0     | ❌ 약관위반 | 50-150 ms    | ❌                     |
| Vercel Pro                          | $20/월 | ✅          | 50-150 ms    | ❌                     |
| CF Workers Paid + 임베디드 Studio   | $5/월  | ✅          | 10-30 ms     | ❌ (16.9 MiB > 10 MiB) |
| Self-hosted (미니 PC)               | 전기료 | ✅          | 50-100 ms    | ❌ (운영 부담)         |

## Consequences

### 장점 (+)

- **월 비용 $0 유지** (도메인 제외)
- **무제한 대역폭** — 바이럴 트래픽에 안전
- **글로벌 edge 330+ 도시** — 한일 사용자에게 10-30 ms latency
- **상업적 사용 명시 허용** — Phase 2 광고/멤버십에 문제 없음
- **자유로운 SNS 자동 동기화** — Workers Cron / Queues / R2 / KV / D1 모두 무료 티어 제공
- **Studio 자동 업데이트** — Sanity 가 Studio 를 호스팅하므로 우리가 빌드/배포 부담 없음

### 단점 (−)

- **Worker 크기 3 MiB 제한** — 큰 의존성 사용 시 주의 필요 (`@vercel/og` 같은 무거운 lib 회피)
- **Studio URL 분리** — `yoursite.com/studio` 가 아닌 `sokosoko.sanity.studio` (작가만 사용하므로 영향 적음)
- **로컬 Windows 빌드 불가** — OpenNext 의 symlink 권한 이슈, WSL 또는 CI 필요
- **OpenNext 가 베타스러움** — 가끔 호환성 이슈, 문서가 빠르게 변함
- **Image Optimization 별도 대응** — `next/image` 의 자동 변환이 CF 에서는 제한적, Cloudflare Images ($) 또는 정적 최적화 우회 필요

## Implementation notes

- `wrangler.jsonc`: Workers 진입점 `.open-next/worker.js`, assets 바인딩, `nodejs_compat` + `global_fetch_strictly_public` 플래그
- `open-next.config.ts`: MVP 기본 설정 (incremental cache 는 R2 추가 시점에)
- `public/_headers`: `/_next/static/*` 1년 immutable 캐시
- `eslint.config.mjs` / `.prettierignore`: 자동 생성된 `cloudflare-env.d.ts` 와 `.open-next/` 빌드 산출물 ignore
- 환경변수 (CF 대시보드에 등록):
  - `NEXT_PUBLIC_SANITY_PROJECT_ID`
  - `NEXT_PUBLIC_SANITY_DATASET=production`
  - `NEXT_PUBLIC_SANITY_API_VERSION=2025-01-01`

자세한 배포 절차: [`docs/runbooks/cloudflare-deploy.md`](../runbooks/cloudflare-deploy.md)

## Phase 2 인프라 (예정)

회원 시스템 도입 시 추가 검토:

- **Auth**: NextAuth + 이메일 인증 / Cloudflare Access / Supabase Auth 중 결정
- **DB**: Supabase (Seoul region) 또는 Cloudflare D1 + Hyperdrive
- **Session/KV**: Cloudflare KV 또는 D1
- **Image storage**: Cloudflare R2 + Images
