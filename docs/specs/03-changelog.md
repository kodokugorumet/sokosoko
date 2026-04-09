# 03. Changelog

PR 단위의 일자별 개발 진척도. 각 행은 머지된 PR.

## 2026-04-08 (Day 1) — 기반 / 디자인 / 정적 페이지

| PR  | 제목                                                           | 영역      |
| --- | -------------------------------------------------------------- | --------- |
| —   | scaffold Next.js 16 + next-intl + Sanity foundation            | bootstrap |
| —   | docs(readme): add Korean translations alongside Japanese       | docs      |
| #1  | chore(sanity): adopt sanity init layout and fix proxy location | infra     |
| #3  | feat(ui): wireframe-faithful redesign of header, menu, home    | ui        |
| #4  | feat(cloudflare): Cloudflare Workers 배포 설정 (OpenNext)      | infra     |
| #5  | docs: 제작 계획 문서를 7개 주제별 파일로 분리 + README/ADR     | docs      |
| #6  | chore(hosting): migrate from Cloudflare Workers to Vercel      | infra     |
| #7  | fix(header): portal MENU drawer to body                        | bugfix    |
| #8  | feat(pages): About · Contact 정적 페이지 추가 (i18n 완비)      | pages     |

## 2026-04-09 (Day 2) — 콘텐츠 파이프라인 + SEO + UX

### 오전 — 브랜드 / 정적 페이지 마무리

| PR  | 제목                                                        |
| --- | ----------------------------------------------------------- |
| #9  | feat(home): add New! badge, community CTA, and SNS footer   |
| #10 | feat(brand): apply logo to header, app icon, and OG image   |
| #11 | feat(seo,qa): add sitemap, robots, and Q&A placeholder page |

### 정오 — Sanity 콘텐츠 파이프라인

| PR  | 제목                                                         |
| --- | ------------------------------------------------------------ |
| #12 | feat(sanity): add reusable GROQ queries and ISR fetch helper |
| #13 | feat(pillar): add /[pillar] listing page with PostCard grid  |
| #14 | feat(post): add /[pillar]/[slug] article detail page         |
| #15 | feat(api): add /api/revalidate sanity webhook handler        |

### 오후 — 홈/Sitemap 실데이터 + 기사 SEO

| PR  | 제목                                                        |
| --- | ----------------------------------------------------------- |
| #16 | feat(home): show latest Sanity posts per pillar             |
| #17 | feat(seo): include pillar & post routes in sitemap          |
| #18 | feat(article): add JSON-LD Article schema + related posts   |
| #19 | feat(article): per-post OG/Twitter + BreadcrumbList JSON-LD |

### 저녁 — 기사 UX

| PR  | 제목                                                       |
| --- | ---------------------------------------------------------- |
| #20 | feat(article): add share buttons and reading time estimate |
| #21 | feat(ui): hand-drawn 404, loading, and error boundaries    |

### 밤 — Q&A 본격 도입

| PR  | 제목                                                       |
| --- | ---------------------------------------------------------- |
| #22 | feat(qa): Sanity-backed questions with list & detail pages |

### 심야 — Q&A SEO + 사이트 검색

| PR     | 제목                                                              |
| ------ | ----------------------------------------------------------------- |
| #23–26 | feat(qa,seo,a11y): QAPage JSON-LD, focus trap, mobile header fix  |
| #30    | chore(deps): bump Next.js 16.2.3 (CVE-2026-23869) + runtime group |
| #34    | chore(ci): pin Dependabot ignore for @types/node major bumps      |
| #35    | feat(search): site-wide search across posts & questions           |
| #36    | feat(seo): GSC verification meta + GA4 (env-driven, optional)     |

## 누적 통계 (2일)

| 항목                 | 수치                                |
| -------------------- | ----------------------------------- |
| 머지된 PR            | 30+                                 |
| 도입한 라우트        | 16                                  |
| Sanity 도큐먼트 타입 | 7                                   |
| GROQ 쿼리            | 11 (검색 2종 추가)                  |
| JSON-LD 스키마 종류  | 3 (Article, BreadcrumbList, QAPage) |
| 지원 로케일          | 2 (ja, ko)                          |

## Phase 1 진행도 (체감)

- **콘텐츠 모델 / 라우트** — ✅ 100% (Q&A · 검색 모두 도입)
- **SEO** — ✅ 95% (GSC 콘솔 등록 후 운영자가 토큰을 Vercel env 에 입력하면 완료)
- **운영 자동화** — ⏳ 60% (Sanity 웹훅 Studio 등록 미완)
- **SNS 자동 송출** — ⏸ 0% (Phase 1 후반)
- **시드 콘텐츠 10편** — ⏸ 운영진 작성 대기
