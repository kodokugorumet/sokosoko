import type { QueryParams } from 'next-sanity';
import { client } from './client';
import { projectId } from '../env';

// CI builds use a placeholder project id (`dummy`) so the build can compile
// without leaking production credentials. Detect that here and short-circuit
// every fetch to the caller-provided fallback — otherwise build-time data
// collection would crash on a 404 from api.sanity.io.
const IS_PLACEHOLDER_PROJECT = projectId === 'dummy';

/**
 * Thin wrapper around `client.fetch` that bakes in our caching defaults.
 *
 * - `tags`: Next.js cache tags so a Sanity webhook (`/api/revalidate`, Phase C-4)
 *   can invalidate exactly the right entries by calling `revalidateTag('post')`.
 * - `revalidate`: 1-hour ISR fallback so even without a webhook, content
 *   eventually refreshes.
 * - `fallback`: returned when the Sanity client cannot be reached (CI build
 *   with `dummy` project id, or transient network failure during prerender).
 *   Callers should pass `[]` for list queries and `null` for single-doc.
 *
 * Pass `revalidate: 0` to opt out of caching for preview/draft fetches.
 */
export async function sanityFetch<T>({
  query,
  params = {},
  tags = ['sanity'],
  revalidate = 3600,
  fallback,
}: {
  query: string;
  params?: QueryParams;
  tags?: string[];
  revalidate?: number;
  fallback?: T;
}): Promise<T> {
  if (IS_PLACEHOLDER_PROJECT) {
    return (fallback ?? (null as unknown as T)) as T;
  }
  try {
    return await client.fetch<T>(query, params, {
      next: {
        revalidate,
        tags,
      },
    });
  } catch (err) {
    if (fallback !== undefined) {
      console.warn('[sanityFetch] falling back due to error:', (err as Error).message);
      return fallback;
    }
    throw err;
  }
}
