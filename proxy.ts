import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

// Next.js 16 renamed `middleware` -> `proxy`.
// next-intl still ships from `next-intl/middleware`, but the file convention here must be `proxy.ts`.
export default createMiddleware(routing);

export const config = {
  // Match everything except API, Next internals, Sanity Studio, and files with an extension.
  matcher: ['/((?!api|_next|_vercel|studio|.*\\..*).*)'],
};
