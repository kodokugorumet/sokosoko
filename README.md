# 소코소코 / 釜山暮らし。いもじょも

부산을 거점으로 한 한일 커뮤니티 「소코소코」 공식 사이트.
釜山を拠点にした韓日コミュニティ「소코소코」公式サイト。

**살다 · 배우다 · 여행하다 / 暮らす・学ぶ・旅する** 3개 기둥으로,
있는 그대로의 부산을 한국어 · 일본어로 전합니다.
等身大の釜山を日本語・韓国語でお届けします。

---

## 기술 스택 / Tech stack

| 영역 / 領域        | 채용 / 採用                                                             |
| ------------------ | ----------------------------------------------------------------------- |
| Framework          | **Next.js 16** (App Router, React 19, Turbopack)                        |
| Language / Styling | TypeScript 5, Tailwind CSS v4                                           |
| i18n               | **next-intl v4** (`ja` / `ko`, 일본어 우선 / 日本語優先)                |
| Backend            | **Supabase** (Postgres + Auth + Storage, Northeast Asia / Seoul region) |
| Editor             | **TipTap v3** (JSON body saved to `posts.body_{ja,ko}` jsonb)           |
| Hosting            | **Vercel** (Hobby 무료 → Phase 2 광고/멤버십 시 Pro $20/월)             |
| Edge middleware    | **`src/proxy.ts`** (next-intl + Supabase session refresh)               |
| Tooling            | pnpm, ESLint, Prettier, Husky, lint-staged, Commitlint                  |

호스팅 결정의 상세한 근거는 [`docs/adr/0003-hosting-vercel.md`](./docs/adr/0003-hosting-vercel.md) 를,
Supabase 전환 결정은 [`docs/adr/0004-drop-sanity-for-supabase.md`](./docs/adr/0004-drop-sanity-for-supabase.md) 를 참고하세요.

배포 절차는 [`docs/runbooks/vercel-deploy.md`](./docs/runbooks/vercel-deploy.md),
Supabase 초기 셋업은 [`docs/runbooks/supabase-setup.md`](./docs/runbooks/supabase-setup.md) 참고.

---

## 시작하기 / Getting started

```bash
# 1. 설치 / Install (Node 20+, pnpm 10+)
pnpm install

# 2. 환경변수 템플릿 복사 / 環境変数テンプレートをコピー
cp .env.example .env.local
# .env.local 에 Supabase URL / anon / service_role 3 개 키 입력

# 3. 개발 서버 실행 / 開発サーバー起動
pnpm dev
```

- 사이트 / Site: http://localhost:3000
- 관리자 게시글 관리 / Admin posts: http://localhost:3000/admin/posts (operator/admin 로그인 후)
- 모더레이션 큐 / Moderation queue: http://localhost:3000/admin/moderation

---

## 스크립트 / Scripts

| Command             | 설명 / 説明                                 |
| ------------------- | ------------------------------------------- |
| `pnpm dev`          | 개발 서버 시작 / Next dev サーバー起動      |
| `pnpm build`        | 프로덕션 빌드 / プロダクションビルド        |
| `pnpm start`        | 프로덕션 서버 / プロダクションサーバー      |
| `pnpm lint`         | ESLint 검사 / ESLint チェック               |
| `pnpm typecheck`    | 타입 검사 / 型チェック (`tsc --noEmit`)     |
| `pnpm format`       | Prettier 자동 정렬 / Prettier 整形          |
| `pnpm format:check` | Prettier 검사 (CI) / Prettier チェック (CI) |

> 배포는 Vercel 이 GitHub push 를 감지해 자동 빌드합니다. 별도의 `deploy` 스크립트는 없습니다.
> デプロイは Vercel が GitHub push を検知して自動ビルドします。`deploy` スクリプトはありません。

---

## 프로젝트 구조 / Project layout

```
src/
  app/
    layout.tsx              # 루트 레이아웃 (html/body/fonts/GA/GSC 메타)
    [locale]/               # 다국어 라우트 (ja / ko)
      layout.tsx            # NextIntl provider + Header/Footer
      page.tsx              # 홈 (Hero + 3-pillar 카드)
      [pillar]/             # /life, /study, /trip
        page.tsx            # 게시글 카드 그리드
        [slug]/page.tsx     # 게시글 상세 + JSON-LD + 댓글
      qa/
        page.tsx            # Q&A 목록 (유저 질문)
        new/page.tsx        # 질문 작성 폼
        [slug]/page.tsx     # 질문 상세 + 답변 + 댓글
      admin/
        posts/              # 관리자 전용 게시글 CRUD (TipTap)
        moderation/         # 숨겨진 댓글 모더레이션 큐
      login/                # 매직 링크 로그인
      onboarding/           # 닉네임 설정
      p/[id]/page.tsx       # 레거시 /p/[id] → /[board]/[slug] 308 리다이렉트
    auth/callback/route.ts  # Supabase 매직 링크 콜백
    sitemap.ts, robots.ts
  components/
    layout/                 # Header, HeaderActions, Footer, LocaleSwitcher, PageHeader
    post/                   # PostCard, ShareButtons
    comments/               # CommentThread, CommentForm, CommentActions
    editor/                 # TipTapEditor
  lib/
    supabase/               # client, server, middleware (cookie-aware SSR)
    auth/                   # getSessionUser, requireRole, signOut action
    posts/queries.ts        # 모든 public 쿼리 헬퍼 (boards, posts, questions, answers, search)
    comments/               # queries + actions
    tiptap/render.ts        # TipTap JSON → HTML (server-side)
    slug.ts                 # NFC-safe slug 생성기
    reading-time.ts         # 한·일·영 혼용 읽기 시간 추정
  i18n/                     # routing, request, navigation
  messages/                 # ja.json, ko.json
  proxy.ts                  # next-intl + Supabase session middleware
supabase/
  migrations/
    0001_init.sql                     # profiles/boards/posts/answers/comments/post_revisions
    0002_comments_and_moderation.sql  # DELETE policies
public/
  brand/                    # 로고·마스코트
docs/
  plan/                     # 초기 제작 계획 (Phase 1 기준)
  adr/                      # Architecture Decision Records
  runbooks/                 # 운영 가이드 (Vercel 배포, Supabase 셋업)
  specs/                    # 요구사항, 기능, NFR, Changelog
```

---

## 문서 / Documentation

| 위치                                                                                           | 내용                                                     |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [`docs/specs/03-changelog.md`](./docs/specs/03-changelog.md)                                   | PR 단위 변경 이력 (가장 최신 상태)                       |
| [`docs/adr/0001-tech-stack.md`](./docs/adr/0001-tech-stack.md)                                 | ADR-0001: 초기 기술 스택 (CMS 부분은 superseded)         |
| [`docs/adr/0002-hosting-cloudflare-workers.md`](./docs/adr/0002-hosting-cloudflare-workers.md) | ADR-0002: CF Workers (superseded)                        |
| [`docs/adr/0003-hosting-vercel.md`](./docs/adr/0003-hosting-vercel.md)                         | ADR-0003: CF Workers → Vercel (현재)                     |
| [`docs/adr/0004-drop-sanity-for-supabase.md`](./docs/adr/0004-drop-sanity-for-supabase.md)     | ADR-0004: Sanity 제거, Supabase 단일 스택 (현재)         |
| [`docs/runbooks/vercel-deploy.md`](./docs/runbooks/vercel-deploy.md)                           | Vercel 배포 절차                                         |
| [`docs/runbooks/supabase-setup.md`](./docs/runbooks/supabase-setup.md)                         | Supabase 초기 셋업 (프로젝트 생성 ~ 첫 admin 부트스트랩) |

---

## 기여하기 / Contributing

- `main` 에서 브랜치를 따고 PR을 엽니다 / `main` から branch を切って PR を出す
- CI (`format:check` / `lint` / `typecheck` / `build` + Lighthouse) 통과 필수
- 커밋은 Conventional Commits / コミットは Conventional Commits
- pre-commit hook 이 lint-staged 로 자동 정렬·검사

---

## 라이선스 / License

운영 단체 「소코소코」 내부 프로젝트입니다. 외부 사용 전 문의 바랍니다.
運営団体「소코소코」内部プロジェクトです。外部利用の前にお問い合わせください。
