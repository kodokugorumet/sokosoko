import type { Adapter, AdapterResult } from './types';

/**
 * LINE Messaging API adapter — STUB.
 *
 * Note: LINE Notify reached EOL on 2025-03-31, so the only path now is
 * the official Messaging API:
 * - Endpoint: POST https://api.line.me/v2/bot/message/broadcast
 *   (or /multicast / /push depending on the audience)
 * - Auth: Bearer {channel-access-token}
 * - Body: { messages: [{ type: 'text', text: '...' }] }
 *
 * The free tier allows ~500 broadcasts/month. For our use case
 * (one message per published article) the broadcast endpoint is the
 * right call — `LINE_TARGET_ID` is reserved here for the future
 * `multicast` mode if we want to limit delivery to specific OA
 * friends.
 */

export const line: Adapter = {
  name: 'line',
  isConfigured() {
    return Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN);
  },
  async publish(): Promise<AdapterResult> {
    return { status: 'skipped', reason: 'line adapter not yet implemented' };
  },
};
