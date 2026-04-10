import { buildOAuth1Header, type OAuth1Creds } from './oauth1';
import { composeMessage } from './compose';

/**
 * Post a tweet to X (Twitter) v2 API.
 *
 * Requires the 4-tuple OAuth 1.0a user-context credentials set in
 * Vercel env vars. If any env var is missing, returns silently with
 * `{ skipped: true }` so the publish flow isn't blocked.
 *
 * Called inline from `publishPost` — NOT as a webhook. The previous
 * Sanity-era implementation used a separate `/api/syndicate` route
 * triggered by a Sanity webhook, but Phase 2-F removed both the route
 * and the webhook. This inline approach is simpler and has no external
 * trigger to manage.
 *
 * Fire-and-forget: the caller `await`s this but a failure does NOT
 * roll back the publish. Errors are logged to the Vercel function log
 * and the publish action returns success regardless.
 */

const API_URL = 'https://api.x.com/2/tweets';
const TEXT_LIMIT = 280;

type TweetResult =
  | { ok: true; id: string; url: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string };

function getCreds(): OAuth1Creds | null {
  const consumerKey = process.env.X_API_KEY;
  const consumerSecret = process.env.X_API_KEY_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) return null;
  return { consumerKey, consumerSecret, accessToken, accessTokenSecret };
}

export async function postTweet(title: string, articleUrl: string): Promise<TweetResult> {
  const creds = getCreds();
  if (!creds) {
    return { ok: false, skipped: true, reason: 'X_API_KEY* env vars not set' };
  }

  const text = composeMessage(title, articleUrl, TEXT_LIMIT);
  const authHeader = buildOAuth1Header('POST', API_URL, creds);

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    const msg = `network error: ${(err as Error).message}`;
    console.error('[postTweet] fetch failed', msg);
    return { ok: false, skipped: false, error: msg };
  }

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { detail?: string; title?: string };
      if (body.detail) detail = `${res.status} ${body.detail}`;
      else if (body.title) detail = `${res.status} ${body.title}`;
    } catch {
      /* body wasn't JSON */
    }
    if (res.status === 429) {
      const reset = res.headers.get('x-rate-limit-reset');
      if (reset) detail += ` (reset at ${new Date(Number(reset) * 1000).toISOString()})`;
    }
    console.error('[postTweet] API error', detail);
    return { ok: false, skipped: false, error: detail };
  }

  const body = (await res.json()) as { data?: { id?: string } };
  const id = body.data?.id;
  if (!id) {
    return { ok: false, skipped: false, error: 'response missing data.id' };
  }

  const url = `https://x.com/i/web/status/${id}`;
  console.log('[postTweet] success', { id, url });
  return { ok: true, id, url };
}
