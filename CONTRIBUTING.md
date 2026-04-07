# Contributing — 소코소코

ありがとうございます / 감사합니다 🙏
このプロジェクトは少人数の有志運営です。プルリクが小さければ小さいほど助かります。

## ブランチ戦略 (GitHub Flow)

- `main` は常にデプロイ可能。直接 push 禁止 (branch protection)。
- 作業ブランチ: `feat/...`, `fix/...`, `docs/...`, `chore/...`
- 1 PR = 1 トピック。小さく速く。

## コミットメッセージ — Conventional Commits

```
<type>(<scope>): <subject>
```

`type` (commitlint enforced):
`feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`

例:

```
feat(home): 3-pillar カード追加
fix(i18n): /ko ルートで Header が JA で表示される問題
docs(adr): 0001 採用技術スタック
```

## ローカル開発

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

PR を出す前に必ず:

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm build
```

CI で同じチェックが走ります。

## i18n ルール

- Strings は `src/messages/{ja,ko}.json` のみに置く。コンポーネント内ハードコード禁止。
- 日本語 first → 韓国語は等価訳 (ニュアンス調整 OK)。
- 新しいキーを追加するときは **両方** に同時に追加する。

## Sanity スキーマ変更

- スキーマ変更は **必ず ADR** を書く (`docs/adr/`)。
- マイグレーションが必要な変更は別 PR にする。
