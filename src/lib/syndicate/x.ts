import type { Adapter, AdapterResult } from './types';

/**
 * X (Twitter) adapter — STUB.
 *
 * Reports `isConfigured()` based on the OAuth 1.0a four-tuple, but
 * `publish()` returns a stable `not-implemented` skip until the
 * operator confirms a developer account and the free tier limit
 * (1,500 posts/month) is acceptable.
 *
 * Implementation notes for the next pass:
 * - Endpoint: POST https://api.x.com/2/tweets
 * - Auth: OAuth 1.0a user context (X v2 free tier still requires this
 *   for write endpoints — bearer tokens are read-only).
 * - Body: { text: string }, max 280 chars.
 * - Use `oauth-1.0a` + `crypto` to sign — no SDK needed.
 * - Failure modes worth handling explicitly: 403 (suspended account /
 *   policy violation) and 429 (rate limit; surface the reset header).
 */

export const x: Adapter = {
  name: 'x',
  isConfigured() {
    return Boolean(
      process.env.X_API_KEY &&
      process.env.X_API_KEY_SECRET &&
      process.env.X_ACCESS_TOKEN &&
      process.env.X_ACCESS_TOKEN_SECRET,
    );
  },
  async publish(): Promise<AdapterResult> {
    return { status: 'skipped', reason: 'x adapter not yet implemented' };
  },
};
