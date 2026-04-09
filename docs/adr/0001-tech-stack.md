# ADR-0001: 技術スタック選定

- Status: **Partially superseded** (CMS portion only)
- Date: 2026-04-08
- Superseded by: [ADR-0004](./0004-drop-sanity-for-supabase.md) — Sanity CMS 부분은 Supabase 로 전환됨 (Phase 2-F, 2026-04-10). Next.js / next-intl / TypeScript / Tailwind / Vercel (ADR-0003) 부분은 유효함.

## Context

소코소코 公式サイトを **完全無料 (~$0/月)** で運用したい。
ターゲットは日本人読者 (JP-first)、副言語に韓国語。
コンテンツ運営は非エンジニアメンバーが担う。

## Decision

| 領域      | 採用                            | 主な理由                                 |
| --------- | ------------------------------- | ---------------------------------------- |
| Framework | Next.js 16 (App Router)         | RSC + i18n + ISR、エコシステム最大       |
| i18n      | next-intl v4                    | App Router 公式サポート、Next.js 16 対応 |
| Styling   | Tailwind CSS v4                 | ゼロ設定、PostCSS plugin で完結          |
| CMS       | Sanity (Free tier)              | 埋め込み Studio、GROQ、画像 CDN          |
| Hosting   | Cloudflare Pages                | 完全無料、独自 SSL、`*.pages.dev`        |
| SNS sync  | 公式 API (X / BSky / IG / LINE) | 第三者 SaaS なしでコスト 0               |

## Consequences

- **+** ランニングコスト 0、ベンダーロックイン弱め (Sanity だけ)。
- **+** Next.js 16 + Tailwind v4 + React 19 = 設定ファイルが激減。
- **−** Next.js 16 のドキュメント・サードパーティ情報がまだ少ない (`middleware → proxy` リネーム等)。
- **−** Cloudflare Pages の Next.js 16 サポートはアダプタ経由 (`@cloudflare/next-on-pages`)。要動作確認。

## Notes

- Phase 2 で Supabase (Seoul) を追加して会員 / DB 機能を導入する想定。
