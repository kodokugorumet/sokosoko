import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Next.js 16 renamed `middleware` -> `proxy`.
// The proxy file must live at the same level as `app/`. With a `src/app` setup,
// that means `src/proxy.ts` (NOT the project root).
export default createMiddleware(routing);

export const config = {
  // Match everything except API, Next internals, Sanity Studio, and files with an extension.
  matcher: ['/', '/((?!api|_next|_vercel|studio|.*\\..*).*)'],
};
