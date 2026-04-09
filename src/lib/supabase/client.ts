import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client. Use only in Client Components.
 *
 * Reads the anon key from `NEXT_PUBLIC_*` env vars, which are baked into the
 * client bundle at build time — never put the service-role key here, it would
 * leak to every visitor.
 *
 * For Server Components, Server Actions, and Route Handlers use
 * `./server.ts` instead — the cookie store is different.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
