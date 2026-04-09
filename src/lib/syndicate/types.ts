/**
 * SNS auto-syndication adapter contract.
 *
 * Each platform (X, Instagram, LINE) implements `Adapter`. The
 * dispatcher (./index.ts) runs every adapter that reports `isConfigured()`
 * and aggregates the results so the operator can see at a glance which
 * channels fired and which were skipped or failed.
 */

export type SyndicationPost = {
  /** Sanity document _id (used for logging + future idempotency). */
  id: string;
  /** Slug.current — used to build the canonical URL. */
  slug: string;
  /** Pillar (life|study|trip) — also used in the URL path. */
  pillar: string;
  /** Title in both locales — adapters pick whichever is non-empty. */
  title: { ja?: string; ko?: string };
  /** Excerpt in both locales (optional). */
  excerpt?: { ja?: string; ko?: string };
  /** Canonical site URL of the published article. */
  url: string;
};

export type AdapterResult =
  | { status: 'ok'; id?: string; url?: string }
  | { status: 'skipped'; reason: string }
  | { status: 'error'; error: string };

export type Adapter = {
  /** Short stable id used in logs and runbook (`x`, `instagram`, `line`). */
  name: string;
  /**
   * True only if every required env var is present. The dispatcher uses
   * this to skip the adapter cleanly instead of throwing — channels are
   * opt-in per environment.
   */
  isConfigured: () => boolean;
  /** Publish to the platform. Should never throw — wrap failures in `error`. */
  publish: (post: SyndicationPost) => Promise<AdapterResult>;
};
