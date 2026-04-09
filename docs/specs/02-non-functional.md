# 02. Non-Functional Specification (NFR)

본 문서는 [01-functional.md](./01-functional.md) 의 기능이 충족해야 하는 품질 속성을 정의합니다.

## 1. 성능 (Performance)

| ID          | 항목                             | 목표                                   | 현재 상태 |
| ----------- | -------------------------------- | -------------------------------------- | --------- |
| NFR-PERF-01 | 홈/Pillar/Article 첫 응답 (TTFB) | < 200ms (Vercel Edge cache hit)        | ✅ ISR    |
| NFR-PERF-02 | LCP (모바일 4G)                  | < 2.5s                                 | 미측정    |
| NFR-PERF-03 | CLS                              | < 0.1                                  | 미측정    |
| NFR-PERF-04 | 홈 GROQ 라운드트립               | 1회 (`LATEST_POSTS_HOME_QUERY` 그룹화) | ✅        |
| NFR-PERF-05 | ISR 재검증 주기                  | 1시간 + 태그 기반 즉시 무효화          | ✅        |
| NFR-PERF-06 | 이미지 최적화                    | `next/image` + Sanity image pipeline   | ✅        |
| NFR-PERF-07 | 폰트 로딩                        | `next/font` self-host, swap, subset    | ✅        |

## 2. SEO

| ID         | 항목                                   | 목표/방법                                 | 상태   |
| ---------- | -------------------------------------- | ----------------------------------------- | ------ |
| NFR-SEO-01 | 모든 정적/동적 URL sitemap.xml 등록    | post + question + 정적 페이지             | ✅     |
| NFR-SEO-02 | robots.txt 노출 (`/studio` 차단)       | `app/robots.ts`                           | ✅     |
| NFR-SEO-03 | hreflang JA/KO alternates              | sitemap + metadata `alternates.languages` | ✅     |
| NFR-SEO-04 | 기사 Article + BreadcrumbList JSON-LD  | `[slug]/page.tsx`                         | ✅     |
| NFR-SEO-05 | OG/Twitter (article type, large_image) | per-post                                  | ✅     |
| NFR-SEO-06 | canonical URL                          | metadata.alternates.canonical             | ✅     |
| NFR-SEO-07 | Q&A 페이지 QAPage JSON-LD              | `qa/[slug]`                               | ⏳     |
| NFR-SEO-08 | Google Search Console 검증             | meta verification                         | 미착수 |

## 3. 다국어 / 접근성

| ID          | 항목                                  | 목표                                   | 상태   |
| ----------- | ------------------------------------- | -------------------------------------- | ------ |
| NFR-I18N-01 | next-intl 기반 JA/KO 메시지 분리      | `messages/{ja,ko}.json`                | ✅     |
| NFR-I18N-02 | locale prefix 정책                    | `as-needed` (ja default)               | ✅     |
| NFR-I18N-03 | `<html lang>` per locale              | layout root                            | ✅     |
| NFR-I18N-04 | 콘텐츠 fallback (양언어 미작성 시)    | 다른 언어 표시 + 안내 배너             | ✅     |
| NFR-A11Y-01 | 모든 인터랙티브 요소 키보드 조작 가능 | `aria-label`, focus ring               | ✅     |
| NFR-A11Y-02 | 색 대비 (WCAG AA)                     | text 4.5:1, large 3:1                  | 미측정 |
| NFR-A11Y-03 | 헤더 드로어 포커스 트랩               | Radix/Headless 패턴 미적용 — 단순 포털 | 부분   |
| NFR-A11Y-04 | 이미지 alt 텍스트                     | Sanity image alt 필드 사용             | ✅     |

## 4. 보안 (Security)

| ID         | 항목                      | 정책                                    | 상태   |
| ---------- | ------------------------- | --------------------------------------- | ------ |
| NFR-SEC-01 | Sanity 토큰 노출 금지     | `NEXT_PUBLIC_*` 외에는 server only      | ✅     |
| NFR-SEC-02 | revalidate 웹훅 HMAC 검증 | `@sanity/webhook` `parseBody`           | ✅     |
| NFR-SEC-03 | XSS 방어                  | PortableText 화이트리스트 + Next escape | ✅     |
| NFR-SEC-04 | CSRF                      | 폼 미존재 (Phase 1 read-only)           | N/A    |
| NFR-SEC-05 | secrets 관리              | `.env.local` + Vercel env vars          | ✅     |
| NFR-SEC-06 | dependency 취약점 스캔    | Dependabot                              | 미설정 |

## 5. 가용성 / 운영

| ID         | 항목               | 목표                                     | 상태             |
| ---------- | ------------------ | ---------------------------------------- | ---------------- |
| NFR-OPS-01 | 가용성             | Vercel Hobby SLA (best-effort)           | ✅               |
| NFR-OPS-02 | 배포 자동화        | git push → Vercel auto deploy            | ✅               |
| NFR-OPS-03 | PR preview         | 모든 PR 별 preview URL                   | ✅               |
| NFR-OPS-04 | CI                 | GitHub Actions: lint + typecheck + build | ✅               |
| NFR-OPS-05 | 콘텐츠 무중단 갱신 | 웹훅 → ISR 태그 무효화                   | ⏳ Studio 미등록 |
| NFR-OPS-06 | 롤백               | Vercel deployment promote                | ✅               |
| NFR-OPS-07 | 로그/모니터링      | Vercel function logs                     | 부분             |

## 6. 유지보수성 (Maintainability)

| ID           | 항목                      | 정책                               | 상태   |
| ------------ | ------------------------- | ---------------------------------- | ------ |
| NFR-MAINT-01 | 코드 스타일               | ESLint + Prettier                  | ✅     |
| NFR-MAINT-02 | 타입 안정성               | TS strict, GROQ `defineQuery`      | ✅     |
| NFR-MAINT-03 | 커밋 컨벤션               | Conventional Commits + commitlint  | ✅     |
| NFR-MAINT-04 | pre-commit 훅             | Husky + lint-staged                | ✅     |
| NFR-MAINT-05 | 문서                      | `docs/plan/` + `docs/specs/` + ADR | ✅     |
| NFR-MAINT-06 | 단일 진실 공급원 (스키마) | Sanity 도큐먼트 = 콘텐츠 truth     | ✅     |
| NFR-MAINT-07 | 테스트                    | 단위/통합 테스트 미도입            | 미착수 |

## 7. 호환성 (Compatibility)

| ID          | 항목                   | 지원 범위                                    | 상태 |
| ----------- | ---------------------- | -------------------------------------------- | ---- |
| NFR-COMP-01 | 브라우저               | 최신 2개 메이저 (Chrome/Safari/Firefox/Edge) | ✅   |
| NFR-COMP-02 | 모바일 우선            | iPhone SE (375px) 부터 정상                  | ✅   |
| NFR-COMP-03 | JavaScript 비활성 환경 | 본문/메타/링크는 SSG HTML 로 동작            | ✅   |
| NFR-COMP-04 | Node 런타임            | Node 20+ (Vercel default)                    | ✅   |
| NFR-COMP-05 | Next.js                | 16.x (Turbopack)                             | ✅   |
| NFR-COMP-06 | Sanity                 | v5, API `2025-01-01`                         | ✅   |
