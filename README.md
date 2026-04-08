# 소코소코 / 釜山暮らし。いもじょも

부산을 거점으로 한 한일 커뮤니티 「소코소코」 공식 사이트.
釜山を拠点にした韓日コミュニティ「소코소코」公式サイト。

**살다 · 배우다 · 여행하다 / 暮らす・学ぶ・旅する** 3개 기둥으로,
있는 그대로의 부산을 한국어 · 일본어로 전합니다.
等身大の釜山を日本語・韓国語でお届けします。

---

## 기술 스택 / Tech stack

| 영역 / 領域        | 채용 / 採用                                                      |
| ------------------ | ---------------------------------------------------------------- |
| Framework          | **Next.js 16** (App Router, React 19, Turbopack)                 |
| Language / Styling | TypeScript 5, Tailwind CSS v4                                    |
| i18n               | **next-intl v4** (`ja` / `ko`, 일본어 우선 / 日本語優先)         |
| CMS                | **Sanity v5** (스튜디오는 별도 호스팅 / Studio は別ホスティング) |
| Hosting (Web)      | **Cloudflare Workers** + `@opennextjs/cloudflare` (무료 / 無料)  |
| Hosting (Studio)   | **Sanity 호스팅** `*.sanity.studio` (무료 / 無料)                |
| SNS auto-sync      | X API (free), Bluesky, Instagram Graph, LINE                     |
| Tooling            | pnpm, ESLint, Prettier, Husky, lint-staged, Commitlint           |

> **Edge runtime 주의 / 注意**
> Next.js 16 의 `proxy.ts` 는 Node.js 런타임 전용이라 CF Workers (Edge) 에서 동작하지 않습니다.
> Next.js 16 の `proxy.ts` は Node.js ランタイム専用なので、CF Workers (Edge) では動作しません。
> 따라서 next-intl 미들웨어는 레거시 파일명인 **`src/middleware.ts`** 로 유지합니다.
> したがって next-intl ミドルウェアはレガシーファイル名 **`src/middleware.ts`** で維持します。

호스팅 결정의 상세한 근거는 [`docs/adr/0002-hosting-cloudflare-workers.md`](./docs/adr/0002-hosting-cloudflare-workers.md) 를 참고하세요.
배포 절차는 [`docs/runbooks/cloudflare-deploy.md`](./docs/runbooks/cloudflare-deploy.md) 를 참고하세요.

---

## 시작하기 / Getting started

```bash
# 1. 설치 / Install (Node 20+, pnpm 10+)
pnpm install

# 2. 환경변수 템플릿 복사 / 環境変数テンプレートをコピー
cp .env.example .env.local

# 3. 개발 서버 실행 / 開発サーバー起動
pnpm dev
```

- 사이트 / Site: http://localhost:3000
- Sanity Studio: 별도 호스팅 → `https://sokosoko.sanity.studio` (배포 후)
  - 로컬 작업: `pnpm sanity dev` → http://localhost:3333

---

## 스크립트 / Scripts

| Command               | 설명 / 説明                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `pnpm dev`            | 개발 서버 시작 / Next dev サーバー起動                                 |
| `pnpm build`          | 프로덕션 빌드 (일반 Next) / プロダクションビルド                       |
| `pnpm start`          | 프로덕션 서버 / プロダクションサーバー                                 |
| `pnpm lint`           | ESLint 검사 / ESLint チェック                                          |
| `pnpm typecheck`      | 타입 검사 / 型チェック (`tsc --noEmit`)                                |
| `pnpm format`         | Prettier 자동 정렬 / Prettier 整形                                     |
| `pnpm format:check`   | Prettier 검사 (CI) / Prettier チェック (CI)                            |
| `pnpm preview`        | OpenNext 빌드 + 로컬 Workers 미리보기 / OpenNext build + local preview |
| `pnpm deploy`         | OpenNext 빌드 + CF Workers 배포 / OpenNext build + deploy              |
| `pnpm cf-typegen`     | `wrangler types` 로 `cloudflare-env.d.ts` 재생성                       |
| `pnpm sanity`         | Sanity CLI 진입점 / Sanity CLI                                         |
| `pnpm sanity:typegen` | Sanity 스키마 → TS 타입 생성                                           |

> **Windows 주의 / 注意**: `pnpm preview` / `pnpm deploy` 는 OpenNext 의 symlink 권한 문제로 Windows 에서 실패합니다. WSL 또는 CI (Linux) 에서 실행하세요. 일반 `pnpm dev` / `pnpm build` 는 Windows 에서 정상 동작합니다.

---

## 프로젝트 구조 / Project layout

```
src/
  app/
    layout.tsx              # 루트 레이아웃 / ルートレイアウト (html/body/fonts)
    [locale]/               # 다국어 라우트 / ローカライズルート (ja / ko)
      layout.tsx            # NextIntl provider + Header/Footer
      page.tsx              # 홈 / ホーム (Hero + 3-pillar 카드)
  components/layout/        # Header, HeaderActions(MENU drawer), Footer, LocaleSwitcher
  i18n/                     # routing, request, navigation
  messages/                 # ja.json, ko.json (UI 문자열 / UI 文字列)
  middleware.ts             # next-intl 미들웨어 (Edge runtime, 레거시 파일명)
sanity/
  env.ts                    # projectId, dataset, apiVersion
  lib/                      # client, image, live
  schemas/                  # post, author, category, tag, bilingualString
  structure.ts              # Studio 데스크 구조
sanity.config.ts            # Sanity Studio 설정 / 設定
sanity.cli.ts               # Sanity CLI 설정
wrangler.jsonc              # Cloudflare Workers 설정
open-next.config.ts         # OpenNext 어댑터 설정
public/
  _headers                  # CF Workers static assets 캐시 헤더
  brand/                    # 로고·마스코트 이미지
docs/
  README.md                 # 문서 인덱스 (작성 예정)
  plan/                     # 제작 계획 (주제별 7개 파일)
  adr/                      # Architecture Decision Records
  runbooks/                 # 운영 가이드 (배포 등)
```

---

## 문서 / Documentation

| 위치                                                                                           | 내용                                            |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| [`docs/plan/`](./docs/plan/)                                                                   | 소코소코 제작 계획 (7개 주제별 문서)            |
| [`docs/plan/00-overview.md`](./docs/plan/00-overview.md)                                       | 한 줄 요약, 핵심 의사결정                       |
| [`docs/plan/01-information-architecture.md`](./docs/plan/01-information-architecture.md)       | 사이트맵, 메뉴/푸터 구조                        |
| [`docs/plan/02-roadmap.md`](./docs/plan/02-roadmap.md)                                         | Phase 0 ~ 3 단계별 로드맵                       |
| [`docs/plan/03-ui-components.md`](./docs/plan/03-ui-components.md)                             | 헤더/푸터/메인/블로그/카드/Q&A 명세             |
| [`docs/plan/04-tech-stack.md`](./docs/plan/04-tech-stack.md)                                   | 채택 스택, DB 필드 요건                         |
| [`docs/plan/05-content-and-ux.md`](./docs/plan/05-content-and-ux.md)                           | UI/UX 원칙, 콘텐츠 전략                         |
| [`docs/plan/06-operations.md`](./docs/plan/06-operations.md)                                   | 역할, 리스크, 액션, KPI                         |
| [`docs/adr/0001-tech-stack.md`](./docs/adr/0001-tech-stack.md)                                 | ADR-0001: 초기 기술 스택 선정                   |
| [`docs/adr/0002-hosting-cloudflare-workers.md`](./docs/adr/0002-hosting-cloudflare-workers.md) | ADR-0002: CF Pages → CF Workers + Sanity 호스팅 |
| [`docs/runbooks/cloudflare-deploy.md`](./docs/runbooks/cloudflare-deploy.md)                   | Cloudflare Workers 배포 절차                    |

---

## 기여하기 / Contributing

- `main` 에서 브랜치를 따고 PR을 엽니다 / `main` から branch を切って PR を出す
- CI (`format:check` / `lint` / `typecheck` / `build`) 통과 필수 / CI 通過必須
- 커밋은 Conventional Commits / コミットは Conventional Commits
- pre-commit hook 이 lint-staged 로 자동 정렬·검사

---

## 라이선스 / License

운영 단체 「소코소코」 내부 프로젝트입니다. 외부 사용 전 문의 바랍니다.
運営団体「소코소코」内部プロジェクトです。外部利用の前にお問い合わせください。
