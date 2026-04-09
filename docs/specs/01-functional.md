# 01. Functional Specification (FS)

## 1. 사이트맵

```
釜山暮らし。いもじょも (Top page)
├─ 暮らす (Life)
│   └─ [기사 상세]
├─ 学ぶ (Study)
│   └─ [기사 상세]
├─ 旅する (Trip)
│   └─ [기사 상세]
├─ Q&A
│   └─ [질문 상세]
├─ About
├─ Contact
└─ /studio (임베디드 Sanity)
```

## 2. 페이지 / 라우트

| ID        | 라우트                      | 설명                                             | 렌더      | 상태 |
| --------- | --------------------------- | ------------------------------------------------ | --------- | ---- |
| F-PAGE-01 | `/[locale]`                 | 홈: hero + 3-pillar 카드 + 모임 CTA + footer SNS | SSG + ISR | ✅   |
| F-PAGE-02 | `/[locale]/about`           | About: 모임 철학, 운영진, 3-pillar 소개          | SSG       | ✅   |
| F-PAGE-03 | `/[locale]/contact`         | Contact: 채널 목록                               | SSG       | ✅   |
| F-PAGE-04 | `/[locale]/[pillar]`        | Pillar 인덱스 (3종): PostCard 그리드             | SSG + ISR | ✅   |
| F-PAGE-05 | `/[locale]/[pillar]/[slug]` | 기사 상세: PortableText, 관련글, 공유, JSON-LD   | SSG + ISR | ✅   |
| F-PAGE-06 | `/[locale]/qa`              | Q&A 목록: featured + 전체                        | SSG + ISR | ✅   |
| F-PAGE-07 | `/[locale]/qa/[slug]`       | Q&A 상세: 답변 PortableText, 로케일 fallback     | SSG + ISR | ✅   |
| F-PAGE-08 | `/sitemap.xml`              | 동적 sitemap (post + question + 정적)            | SSG + ISR | ✅   |
| F-PAGE-09 | `/robots.txt`               | robots.txt                                       | Static    | ✅   |
| F-PAGE-10 | `/api/revalidate`           | Sanity 웹훅 수신 (HMAC 검증)                     | Dynamic   | ✅   |
| F-PAGE-11 | `/studio`                   | 임베디드 Sanity Studio                           | Dynamic   | ✅   |
| F-PAGE-12 | `/-/opengraph-image`        | 동적 OG 이미지                                   | Dynamic   | ✅   |
| F-PAGE-13 | `/[locale]/not-found`       | 404 손글씨 페이지                                | Static    | ✅   |
| F-PAGE-14 | `/[locale]/loading`         | route loading skeleton                           | Static    | ✅   |
| F-PAGE-15 | `/[locale]/error`           | error boundary (reset)                           | Client    | ✅   |
| F-PAGE-16 | `/[locale]/search`          | 사이트 검색 (post + Q&A, GROQ `match`, noindex)  | Dynamic   | ✅   |

## 3. 컴포넌트 / 글로벌

| ID        | 기능                                                           | 위치                            | 상태 |
| --------- | -------------------------------------------------------------- | ------------------------------- | ---- |
| F-COMP-01 | 글로벌 헤더 (브랜드 워드마크 + LocaleSwitcher + LOG IN + MENU) | `Header.tsx`                    | ✅   |
| F-COMP-02 | MENU 드로어 (우측 슬라이드인, body portal)                     | `Menu.tsx`                      | ✅   |
| F-COMP-03 | LocaleSwitcher (JP\|KR 토글)                                   | `LocaleSwitcher.tsx`            | ✅   |
| F-COMP-04 | Footer (SNS 4종 + privacy / terms / contact)                   | `Footer.tsx`                    | ✅   |
| F-COMP-05 | PostCard (PostList 그리드용)                                   | `post/PostCard.tsx`             | ✅   |
| F-COMP-06 | PortableTextRenderer (image / h2 / blockquote / link 매핑)     | `post/PortableTextRenderer.tsx` | ✅   |
| F-COMP-07 | ShareButtons (X intent + LINE share + copy link)               | `post/ShareButtons.tsx`         | ✅   |
| F-COMP-08 | PageHeader (정적 페이지 공용 헤더)                             | `layout/PageHeader.tsx`         | ✅   |

## 4. 콘텐츠 모델 (Sanity 스키마)

| ID       | 도큐먼트 타입     | 주요 필드                                                                                                      | 상태 |
| -------- | ----------------- | -------------------------------------------------------------------------------------------------------------- | ---- |
| F-CMS-01 | `bilingualString` | `ja`, `ko`                                                                                                     | ✅   |
| F-CMS-02 | `bilingualText`   | `ja`, `ko` (text)                                                                                              | ✅   |
| F-CMS-03 | `author`          | `name`(bilingual), `tier`(crown/apple/contributor), `slug`, `bio`                                              | ✅   |
| F-CMS-04 | `category`        | `title`(bilingual), `pillar`(life/study/trip), `slug`, `description`, `order`                                  | ✅   |
| F-CMS-05 | `tag`             | `title`(bilingual), `slug`                                                                                     | ✅   |
| F-CMS-06 | `post`            | `title`, `slug`, `excerpt`, `coverImage`, `category→`, `author→`, `tags[]→`, `publishedAt`, `bodyJa`, `bodyKo` | ✅   |
| F-CMS-07 | `question`        | `title`(bilingual), `slug`, `pillar`, `featured`, `askedAt`, `answerJa`, `answerKo`                            | ✅   |

## 5. GROQ 쿼리

| ID       | 쿼리                         | 용도                                   | 캐시 태그                     | 상태   |
| -------- | ---------------------------- | -------------------------------------- | ----------------------------- | ------ |
| F-QRY-01 | `POSTS_BY_PILLAR_QUERY`      | pillar 인덱스 페이지                   | `post`, `pillar:<slug>`       | ✅     |
| F-QRY-02 | `POST_BY_SLUG_QUERY`         | 기사 상세 (양언어 body)                | `post`, `post:<slug>`         | ✅     |
| F-QRY-03 | `RELATED_POSTS_QUERY`        | 같은 pillar 최신 3개 (자기 제외)       | `post`, `pillar:<slug>`       | ✅     |
| F-QRY-04 | `LATEST_POSTS_HOME_QUERY`    | 홈: pillar 별 2개 그룹 단일 라운드트립 | `post`, `home`                | ✅     |
| F-QRY-05 | `ALL_POST_SLUGS_QUERY`       | generateStaticParams + sitemap         | `post`                        | ✅     |
| F-QRY-06 | `CATEGORIES_BY_PILLAR_QUERY` | (Phase 1 후반 카테고리 칩 사용 예정)   | `sanity`                      | 미사용 |
| F-QRY-07 | `QUESTIONS_QUERY`            | Q&A 목록 (featured 우선)               | `question`                    | ✅     |
| F-QRY-08 | `QUESTION_BY_SLUG_QUERY`     | Q&A 상세 (양언어 answer)               | `question`, `question:<slug>` | ✅     |
| F-QRY-09 | `ALL_QUESTION_SLUGS_QUERY`   | generateStaticParams + sitemap         | `question`                    | ✅     |

## 6. SEO / 구조화 데이터

| ID       | 기능                                                    | 위치                         | 상태 |
| -------- | ------------------------------------------------------- | ---------------------------- | ---- |
| F-SEO-01 | sitemap.xml 동적 (모든 post + question 포함)            | `app/sitemap.ts`             | ✅   |
| F-SEO-02 | robots.txt                                              | `app/robots.ts`              | ✅   |
| F-SEO-03 | hreflang `xhtml:link` alternates (JA/KO)                | sitemap + metadata           | ✅   |
| F-SEO-04 | 기사 OpenGraph (article, publishedTime, authors, cover) | `[slug]/page.tsx`            | ✅   |
| F-SEO-05 | 기사 Twitter Card (summary_large_image when cover)      | `[slug]/page.tsx`            | ✅   |
| F-SEO-06 | 기사 Article JSON-LD (headline, author, image, dates)   | `[slug]/page.tsx`            | ✅   |
| F-SEO-07 | 기사 BreadcrumbList JSON-LD (Home → Pillar → Article)   | `[slug]/page.tsx`            | ✅   |
| F-SEO-08 | 기사 canonical URL + hreflang alternates                | metadata                     | ✅   |
| F-SEO-09 | 동적 OG 이미지 (사이트 기본)                            | `opengraph-image.tsx`        | ✅   |
| F-SEO-10 | favicon / app-icon (브랜드 로고)                        | `icon.png`, `apple-icon.png` | ✅   |
| F-SEO-11 | Q&A QAPage JSON-LD (acceptedAnswer 평문 추출)           | `qa/[slug]/page.tsx`         | ✅   |

## 7. 콘텐츠 UX

| ID      | 기능                                                   | 상태         |
| ------- | ------------------------------------------------------ | ------------ |
| F-UX-01 | 홈 New! 배지 (14일 이내 발행 시)                       | ✅           |
| F-UX-02 | 기사 readingTime (CJK 500 cpm + Latin 230 wpm)         | ✅           |
| F-UX-03 | 기사 share 버튼 (X intent / LINE / 링크 복사)          | ✅           |
| F-UX-04 | 기사 관련 글 3개 (같은 pillar)                         | ✅           |
| F-UX-05 | 로케일 fallback 배너 (번역 미준비 시 다른 언어로 표시) | ✅           |
| F-UX-06 | Q&A 로케일 fallback 배너                               | ✅           |
| F-UX-07 | 손글씨 톤 404 / loading / error 페이지                 | ✅           |
| F-UX-08 | 검색 (post + question 통합)                            | ⏳ Phase D-5 |
| F-UX-09 | 댓글 (giscus 등)                                       | 미정         |

## 8. 운영 / 인프라

| ID       | 기능                                                        | 상태                              |
| -------- | ----------------------------------------------------------- | --------------------------------- |
| F-OPS-01 | 임베디드 Sanity Studio (`/studio`)                          | ✅                                |
| F-OPS-02 | Vercel Hobby 배포 + 자동 PR preview                         | ✅                                |
| F-OPS-03 | ISR 1시간 + 태그 기반 무효화 (`sanityFetch` 헬퍼)           | ✅                                |
| F-OPS-04 | Sanity GROQ-Powered Webhook → `/api/revalidate` (HMAC 검증) | ⏳ 핸들러 ✅ / Studio 등록 미완료 |
| F-OPS-05 | GitHub Actions (lint / typecheck / build)                   | ✅                                |
| F-OPS-06 | Conventional Commits + commitlint + Husky + lint-staged     | ✅                                |
| F-OPS-07 | SNS 자동 송출 (X / IG / LINE / note)                        | 미착수 (Phase 1 후반)             |
| F-OPS-08 | Google Search Console 연동                                  | 미착수                            |
| F-OPS-09 | Google Analytics 연동                                       | 미착수                            |
