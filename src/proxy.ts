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
  // Match everything except Next internals, the Supabase magic-link
  // callback, and files with an extension.
  //
  // `/auth/*` MUST be excluded: it's a non-locale Route Handler
  // (`src/app/auth/callback/route.ts`) and next-intl's middleware would
  // otherwise rewrite `/auth/callback` → `/ja/auth/callback`, which doesn't
  // match any route and returns 404 — which is exactly what broke the first
  // magic link sign-in on production.
  //
  // `api` is still excluded even though no /api routes currently exist,
  // because Next.js reserves the prefix for future Route Handlers and we
  // don't want next-intl locale rewriting to interfere if we add one.
  // `studio` and `_vercel` are gone — Studio with Sanity, _vercel never
  // used for anything in Phase 2.
  matcher: ['/', '/((?!api|_next|auth|.*\\..*).*)'],
};
