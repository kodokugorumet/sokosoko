import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Refresh the Supabase auth session on every request. Returns the response
 * (with any rotated cookies attached) so the caller can either return it
 * directly or merge with another middleware's response (e.g. next-intl).
 *
 * IMPORTANT: this MUST run before any code that reads `auth.getUser()` /
 * `auth.getSession()` server-side, otherwise the access token can expire
 * mid-render and the user gets bounced to /login spuriously.
 *
 * Cribbed from the official @supabase/ssr Next.js docs and adapted to
 * compose with next-intl's middleware in `src/proxy.ts`.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  // No-op when Supabase isn't configured (local dev without .env.local,
  // CI builds, etc.). Auth pages will still render — they handle missing
  // config themselves — so the rest of the site stays usable.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Apply rotated cookies to BOTH the incoming request (so any
        // downstream code in this same request sees them) and the outgoing
        // response (so the browser stores them).
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touching `getUser()` is what actually triggers the access-token refresh
  // when needed. The result is intentionally ignored here — Server Components
  // will call it again on the same request and get the fresh value.
  await supabase.auth.getUser();

  return response;
}
