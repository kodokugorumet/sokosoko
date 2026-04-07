# 소코소코 / 釜山暮らし。いもじょも

부산을 거점으로 한 한일 커뮤니티 「소코소코」 공식 사이트.
釜山を拠点にした韓日コミュニティ「소코소코」公式サイト。

**살다 · 배우다 · 여행하다 / 暮らす・学ぶ・旅する** 3개 기둥으로,
있는 그대로의 부산을 한국어 · 일본어로 전합니다.
等身大の釜山を日本語・韓国語でお届けします。

---

## 기술 스택 / Tech stack

| 영역 / 領域        | 채용 / 採用                                   |
| ------------------ | --------------------------------------------- |
| Framework          | **Next.js 16** (App Router, React 19)         |
| Language / Styling | TypeScript 5, Tailwind CSS v4                 |
| i18n               | **next-intl v4** (`ja` / `ko`, 일본어 우선)   |
| CMS                | **Sanity v5** (`/studio` 임베디드 / 埋め込み) |
| Hosting            | Cloudflare Pages (무료 / 無料 `*.pages.dev`)  |
| SNS auto-sync      | X API (free), Bluesky, Instagram Graph, LINE  |
| Tooling            | pnpm, ESLint, Prettier, Husky, Commitlint     |

> **Next.js 16 주의 / 注意:** 기존 `middleware.ts` 파일 컨벤션이 `proxy.ts` 로 이름이 바뀌었습니다.
> 旧 `middleware.ts` ファイル規約は `proxy.ts` にリネームされました。
> 프로젝트 루트의 `proxy.ts` 를 확인하세요. / プロジェクトルートの `proxy.ts` を参照。

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
- Sanity Studio (임베디드 / 埋め込み): http://localhost:3000/studio

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

---

## 프로젝트 구조 / Project layout

```
src/
  app/
    layout.tsx              # 루트 레이아웃 / ルートレイアウト (html/body/fonts)
    [locale]/               # 다국어 라우트 / ローカライズルート (ja / ko)
      layout.tsx            # NextIntl provider + Header/Footer
      page.tsx              # 홈 / ホーム (3-pillar カード)
    studio/[[...tool]]/     # 임베디드 Sanity Studio / 埋め込み
  components/layout/        # Header, Footer, LocaleSwitcher
  i18n/                     # routing, request, navigation
  messages/                 # ja.json, ko.json (UI 문자열 / UI 文字列)
  lib/sanity/               # client, image, env
sanity/schemas/             # post, author, category, tag
proxy.ts                    # next-intl 미들웨어 / ミドルウェア (Next 16)
sanity.config.ts            # Sanity Studio 설정 / 設定
docs/                       # 계획, ADR, 운영 가이드 / プラン・ADR・runbook
```

---

## 기여하기 / Contributing

자세한 내용은 [CONTRIBUTING.md](./CONTRIBUTING.md) 를 참고하세요.
詳細は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照。

**TL;DR**

- `main` 에서 브랜치를 따고 PR을 엽니다 / `main` から branch を切って PR を出す
- CI (`lint` / `typecheck` / `build`) 통과 필수 / CI 通過必須
- 커밋은 Conventional Commits / コミットは Conventional Commits

---

## 라이선스 / License

운영 단체 「소코소코」 내부 프로젝트입니다. 외부 사용 전 문의 바랍니다.
運営団体「소코소코」内部プロジェクトです。外部利用の前にお問い合わせください。
