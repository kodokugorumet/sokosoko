'use server';

import { requireRole } from '@/lib/auth/require-role';
import { postRawTweet } from '@/lib/syndicate/x';

/**
 * Standalone broadcast: send a custom message to selected SNS platforms
 * without creating a post. Used from /admin/broadcast for announcements,
 * event invites, or quick shares that don't warrant a full article.
 *
 * Each platform call is independent — if X succeeds but a future LINE
 * adapter fails, the results array shows both. No rollback.
 */

export type BroadcastPlatform = 'x'; // extend with 'line' | 'instagram' later

export type BroadcastResult = {
  platform: BroadcastPlatform;
  ok: boolean;
  detail: string;
};

export async function broadcastMessage(formData: FormData): Promise<BroadcastResult[]> {
  await requireRole('operator');

  const message = String(formData.get('message') ?? '').trim();
  if (!message) return [{ platform: 'x', ok: false, detail: 'empty message' }];

  // Which platforms the operator checked.
  const platforms = new Set<BroadcastPlatform>();
  if (formData.get('platform_x') === 'on') platforms.add('x');
  // future: if (formData.get('platform_line') === 'on') platforms.add('line');

  if (platforms.size === 0) {
    return [{ platform: 'x', ok: false, detail: 'no platform selected' }];
  }

  const results: BroadcastResult[] = [];

  if (platforms.has('x')) {
    // For standalone broadcasts the operator writes the full text (up
    // to 280 chars) themselves — no auto-compose needed.
    const res = await postRawTweet(message.slice(0, 280)).catch((err) => ({
      ok: false as const,
      skipped: false as const,
      error: String(err),
    }));
    if ('ok' in res && res.ok === true) {
      results.push({ platform: 'x', ok: true, detail: `Tweet posted: ${res.url}` });
    } else if ('skipped' in res && res.skipped) {
      results.push({ platform: 'x', ok: false, detail: `Skipped: ${res.reason}` });
    } else {
      results.push({
        platform: 'x',
        ok: false,
        detail: `Error: ${'error' in res ? res.error : 'unknown'}`,
      });
    }
  }

  return results;
}
