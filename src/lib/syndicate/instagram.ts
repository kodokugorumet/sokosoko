import type { Adapter, AdapterResult } from './types';

/**
 * Instagram (Graph API) adapter — STUB.
 *
 * IG Graph API requires:
 * - A Facebook Page linked to an Instagram **Business** or **Creator** account
 * - A long-lived Page Access Token (60-day, refreshable)
 * - The IG User ID (numeric, distinct from the @handle)
 *
 * Posting flow is two-step (the API has no "post text only" endpoint
 * — every post must have media):
 *   1. POST /{ig-user-id}/media          → returns container_id
 *      body: { image_url, caption }
 *   2. POST /{ig-user-id}/media_publish  → returns media_id
 *      body: { creation_id: container_id }
 *
 * The image_url must be publicly fetchable by Facebook's crawler — for
 * us that means the Sanity CDN URL of the post's coverImage. We can't
 * post text-only, so posts without a coverImage will be skipped.
 */

export const instagram: Adapter = {
  name: 'instagram',
  isConfigured() {
    return Boolean(process.env.IG_USER_ID && process.env.IG_ACCESS_TOKEN);
  },
  async publish(): Promise<AdapterResult> {
    return { status: 'skipped', reason: 'instagram adapter not yet implemented' };
  },
};
