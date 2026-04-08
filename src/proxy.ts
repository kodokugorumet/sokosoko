import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Next.js 16 introduced `proxy.ts` as the new file convention (renamed from
// `middleware.ts`). Vercel runs this on Node.js runtime by default, which is
// what we want for Sanity client + next-intl. Lives at `src/proxy.ts` because
// our app code lives under `src/app/`.
export default createMiddleware(routing);

export const config = {
  // Match everything except API, Next internals, Sanity Studio, and files with an extension.
  matcher: ['/', '/((?!api|_next|_vercel|studio|.*\\..*).*)'],
};
