import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Cloudflare Workers (via @opennextjs/cloudflare) requires Edge runtime middleware.
// Next.js 16's new `proxy.ts` only runs on Node.js, so we keep using the legacy
// `middleware.ts` filename which still runs on Edge. The file must live at the
// same level as `app/` — with `src/app/` that means `src/middleware.ts`.
export default createMiddleware(routing);

export const config = {
  // Match everything except API, Next internals, Sanity Studio, and files with an extension.
  matcher: ['/', '/((?!api|_next|_vercel|studio|.*\\..*).*)'],
};
