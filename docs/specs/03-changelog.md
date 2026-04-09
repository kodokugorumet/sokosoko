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

| PR     | 제목                                                                      |
| ------ | ------------------------------------------------------------------------- |
| #23–26 | feat(qa,seo,a11y): QAPage JSON-LD, focus trap, mobile header fix          |
| #30    | chore(deps): bump Next.js 16.2.3 (CVE-2026-23869) + runtime group         |
| #34    | chore(ci): pin Dependabot ignore for @types/node major bumps              |
| #35    | feat(search): site-wide search across posts & questions                   |
| #36    | feat(seo): GSC verification meta + GA4 (env-driven, optional)             |
| #37    | docs(ops): runbook for Sanity revalidate webhook registration             |
| #38    | docs(ops): editor-facing content authoring guide for Studio               |
| #39    | feat(sns): Bluesky auto-syndication + adapter scaffold for X/IG/LINE      |
| #40    | feat(sns): full X (Twitter) v2 adapter with OAuth 1.0a signer             |
| #41    | chore(seo): hardcode GSC verification token                               |
| #42    | ci(lighthouse): add LHCI workflow with perf/a11y/seo assertions           |
| #43    | chore(sns): drop Bluesky adapter and unused @atproto/api / twitter-api-v2 |
| #44    | fix(i18n): render <html lang> and not-found page in the actual locale     |
| #45    | docs(adr): ADR-0004 — drop Sanity for Supabase single stack               |

## 2026-04-10 (Day 3) — Phase 2 실행

### Phase 2-A~B: 기반 구축

| PR  | 제목                                                               |
| --- | ------------------------------------------------------------------ |
| #46 | feat(auth): Phase 2-B — Supabase 기반 (auth, profiles, onboarding) |
| #47 | fix(auth): proxy matcher 에서 `/auth/*` 제외                       |
| #48 | fix(onboarding): 닉네임 저장 후 layout cache 무효화                |

### Phase 2-C: 관리자 게시글 + TipTap

| PR  | 제목                                                                  |
| --- | --------------------------------------------------------------------- |
| #49 | feat(admin): Phase 2-C — TipTap 에디터 + 관리자 게시글 CRUD + /p/[id] |
| #50 | fix(admin): 공개/비공개 버튼 레이블 정리                              |

### Phase 2-D: Q&A + 유저 답변 + 신뢰 뱃지

| PR  | 제목                                                                          |
| --- | ----------------------------------------------------------------------------- |
| #51 | feat(qa): Phase 2-D — Q&A + 유저 답변 + 신뢰 뱃지 정렬                        |
| #52 | fix(slug): NFKD → NFC 로 한글 Hangul URL round-trip                           |
| #53 | fix(qa): PostgREST embed 실패 우회를 위해 Q&A 쿼리 two-step 재작성            |
| #54 | fix(qa): `redirect()` 전에 슬러그 percent-encode (FUNCTION_INVOCATION_FAILED) |
| #55 | fix(qa): defensive slug lookup + fallback scan + 진단 로그                    |
| #56 | fix(editor): TipTap 중복 Link extension 제거 + 슬러그 후보 승자 로깅          |
| #57 | chore(deps): 미사용 `@tiptap/extension-link` 제거                             |
| #58 | refactor(qa): 슬러그 lookup 을 `decodeURIComponent` 하나로 정리 (로그 근거로) |

### Phase 2-E: 댓글 + 모더레이션

| PR  | 제목                                                                |
| --- | ------------------------------------------------------------------- |
| #59 | feat(comments): Phase 2-E — 스레드 댓글 + 모더레이션 큐 + 신뢰 뱃지 |

### Phase 2-F: Sanity 완전 제거

| PR  | 제목                                                                                    |
| --- | --------------------------------------------------------------------------------------- |
| #60 | feat(phase-2f): Sanity 백엔드 완전 제거, 모든 public 페이지 Supabase 전환 (-9460 lines) |
| #61 | refactor: SupabasePostCard → PostCard 이름 복원                                         |
| #62 | feat(qa): per-answer comments + CommentThread compact variant                           |
| #63 | fix(seo): localized not-found 페이지에 robots:noindex 마크                              |

## 누적 통계 (3일)

| 항목                | 수치                                                           |
| ------------------- | -------------------------------------------------------------- |
| 머지된 PR           | 60+                                                            |
| 도입한 라우트       | 17 (Sanity 3개 제거, Supabase 6개 신규)                        |
| Supabase 테이블     | 6 (profiles, boards, posts, answers, comments, post_revisions) |
| RLS 정책            | 20+                                                            |
| 서버 쿼리 헬퍼      | 15+ (posts + comments)                                         |
| JSON-LD 스키마 종류 | 2 (Article, BreadcrumbList)                                    |
| 지원 로케일         | 2 (ja, ko)                                                     |

## Phase 2 진행도

| 단계      | 설명                                  | 상태 |
| --------- | ------------------------------------- | ---- |
| Phase 2-A | ADR-0004 (#45) 결정 문서              | ✅   |
| Phase 2-B | 기반 (#46 ~ #48)                      | ✅   |
| Phase 2-C | 관리자 게시글 + TipTap (#49, #50)     | ✅   |
| Phase 2-D | Q&A + 답변 + 신뢰 뱃지 (#51 ~ #58)    | ✅   |
| Phase 2-E | 댓글 + 모더레이션 (#59)               | ✅   |
| Phase 2-F | Sanity 제거 + 라우팅 정리 (#60 ~ #63) | ✅   |

**Phase 2 완료.** Sanity 가 코드베이스에서 완전히 사라짐. Phase 3 으로 자연스럽게 이어지는 항목들:

- Supabase Storage 이미지 업로드 + `next/image` 파이프라인 (Phase 2-G)
- 알림 시스템 (자기 글에 댓글 달릴 때 이메일/push)
- 유저 프로필 페이지 (`/@nickname`)
- 포인트/뱃지 시스템 (Q&A helpful 카운트 기반 verified 승격)
- 스팸 방지 (Cloudflare Turnstile)
