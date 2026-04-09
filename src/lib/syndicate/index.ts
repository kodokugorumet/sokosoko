import type { Adapter, AdapterResult, SyndicationPost } from './types';
import { x } from './x';
import { instagram } from './instagram';
import { line } from './line';

export type { SyndicationPost, AdapterResult } from './types';

const ALL_ADAPTERS: Adapter[] = [x, instagram, line];

export type DispatchResult = {
  adapter: string;
  configured: boolean;
  result: AdapterResult;
};

/**
 * Run every adapter that reports `isConfigured()` in parallel and
 * return one row per adapter. Unconfigured adapters are still listed
 * (with `configured: false` and a `skipped` result) so the operator
 * can see at a glance which channels need credentials.
 *
 * The dispatcher never throws — adapter failures are wrapped in
 * `{ status: 'error', error }` so a single broken platform doesn't
 * take the whole webhook down.
 */
export async function dispatchSyndication(post: SyndicationPost): Promise<DispatchResult[]> {
  const tasks = ALL_ADAPTERS.map(async (adapter): Promise<DispatchResult> => {
    const configured = adapter.isConfigured();
    if (!configured) {
      return {
        adapter: adapter.name,
        configured: false,
        result: { status: 'skipped', reason: 'not configured' },
      };
    }
    try {
      const result = await adapter.publish(post);
      return { adapter: adapter.name, configured: true, result };
    } catch (err) {
      // Defensive: adapters are supposed to wrap their own errors,
      // but if one slips through we don't want to crash the route.
      return {
        adapter: adapter.name,
        configured: true,
        result: { status: 'error', error: (err as Error).message },
      };
    }
  });
  return Promise.all(tasks);
}
