import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

// Next.js 16 introduced `proxy.ts` as the new file convention (renamed from
// `middleware.ts`). Vercel runs this on Node.js runtime by default, which is
// what we want for Sanity client + next-intl. Lives at `src/proxy.ts` because
// our app code lives under `src/app/`.
//
// Two middlewares run in sequence on every matched request:
//   1. next-intl handles locale detection / rewrite (yields a NextResponse).
//   2. Supabase refreshes the auth session and attaches rotated cookies to
//      the SAME response object so the browser stores them.
//
// Order matters: next-intl produces the response (sometimes a rewrite to
// `/ja/...`); Supabase then merges its cookies onto that response. If we
// flipped the order Supabase's response would be discarded.

const intlMiddleware = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const response = intlMiddleware(request);
  return updateSession(request, response);
}

export const config = {
  // Match everything except API, Next internals, Sanity Studio, and files with an extension.
  matcher: ['/', '/((?!api|_next|_vercel|studio|.*\\..*).*)'],
};
