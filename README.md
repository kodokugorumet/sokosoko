# 소코소코 / 釜山暮らし。いもじゃも

釜山を拠点にした韓日コミュニティ「소코소코」公式サイト。
**暮らす・学ぶ・旅する** の3本柱で、等身大の釜山を日本語・韓国語でお届けします。

## Tech stack

| 領域               | 採用                                              |
| ------------------ | ------------------------------------------------- |
| Framework          | **Next.js 16** (App Router, React 19)             |
| Language / Styling | TypeScript 5, Tailwind CSS v4                     |
| i18n               | **next-intl v4** (`ja` / `ko`, JP-first)          |
| CMS                | **Sanity v5** (embedded Studio at `/studio`)      |
| Hosting            | Cloudflare Pages (free `*.pages.dev` subdomain)   |
| SNS auto-sync      | X API (free tier), Bluesky, Instagram Graph, LINE |
| Tooling            | pnpm, ESLint, Prettier, Husky, Commitlint         |

> **Next.js 16 note:** the old `middleware.ts` file convention was renamed to `proxy.ts`.
> See `proxy.ts` in the project root.

## Getting started

```bash
# 1. Install (Node 20+, pnpm 10+)
pnpm install

# 2. Copy env template and fill in values
cp .env.example .env.local

# 3. Run dev server
pnpm dev
```

- Site: http://localhost:3000
- Sanity Studio (embedded): http://localhost:3000/studio

## Scripts

| Command             | What it does           |
| ------------------- | ---------------------- |
| `pnpm dev`          | Start Next dev server  |
| `pnpm build`        | Production build       |
| `pnpm start`        | Serve production build |
| `pnpm lint`         | ESLint                 |
| `pnpm typecheck`    | `tsc --noEmit`         |
| `pnpm format`       | Prettier write         |
| `pnpm format:check` | Prettier check (CI)    |

## Project layout

```
src/
  app/
    layout.tsx              # Root layout (html/body/fonts)
    [locale]/               # Localized routes (ja / ko)
      layout.tsx            # NextIntl provider + Header/Footer
      page.tsx              # Home (3-pillar cards)
    studio/[[...tool]]/     # Embedded Sanity Studio
  components/layout/        # Header, Footer, LocaleSwitcher
  i18n/                     # routing, request, navigation
  messages/                 # ja.json, ko.json
  lib/sanity/               # client, image, env
sanity/schemas/             # post, author, category, tag
proxy.ts                    # next-intl middleware (Next 16 convention)
sanity.config.ts            # Sanity Studio config
docs/                       # Plans, ADRs, runbooks
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). TL;DR: branch off `main`, open a PR,
pass CI (`lint` / `typecheck` / `build`), and use Conventional Commits.
