import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Sentinel thrown when Supabase env vars are missing. Server Components
 * that gate on auth (e.g. /login) catch this and render a "not configured"
 * panel instead of a 500. Production deploys always have the vars set, so
 * this only fires in local dev without `.env.local` and during CI builds.
 */
export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY) are missing');
    this.name = 'SupabaseNotConfiguredError';
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Server-side Supabase client for Server Components, Server Actions, and
 * Route Handlers. Reads/writes the auth cookie via `next/headers`.
 *
 * Each call creates a fresh client because the cookie store is request-scoped
 * — caching the client across requests would leak sessions.
 *
 * Throws `SupabaseNotConfiguredError` if env vars are missing — callers
 * should either guard with `isSupabaseConfigured()` first or catch the
 * sentinel and degrade gracefully.
 *
 * Note: from inside a Server Component you can `await createClient()` and
 * `await client.auth.getUser()` to read the current user. Writes (sign out,
 * etc.) belong in a Server Action or Route Handler so the cookie set is
 * actually applied to the response.
 */
export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new SupabaseNotConfiguredError();
  }
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot set cookies — that's fine, the
            // session refresh runs in the proxy/middleware path which has
            // a Response object to attach Set-Cookie to. Swallow here.
          }
        },
      },
    },
  );
}
