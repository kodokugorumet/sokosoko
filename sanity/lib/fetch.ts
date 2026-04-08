import type { QueryParams } from 'next-sanity';
import { client } from './client';

/**
 * Thin wrapper around `client.fetch` that bakes in our caching defaults.
 *
 * - `tags`: Next.js cache tags so a Sanity webhook (`/api/revalidate`, Phase C-4)
 *   can invalidate exactly the right entries by calling `revalidateTag('post')`.
 * - `revalidate`: 1-hour ISR fallback so even without a webhook, content
 *   eventually refreshes.
 *
 * Pass `revalidate: 0` to opt out of caching for preview/draft fetches.
 */
export async function sanityFetch<T>({
  query,
  params = {},
  tags = ['sanity'],
  revalidate = 3600,
}: {
  query: string;
  params?: QueryParams;
  tags?: string[];
  revalidate?: number;
}): Promise<T> {
  return client.fetch<T>(query, params, {
    next: {
      revalidate,
      tags,
    },
  });
}
