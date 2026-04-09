import type { Adapter, AdapterResult, SyndicationPost } from './types';
import { composeMessage } from './compose';
import { buildOAuth1Header, type OAuth1Credentials } from './oauth1';

/**
 * X (Twitter) v2 adapter.
 *
 * Auth: OAuth 1.0a **user context** — the v2 write endpoints still
 * require the legacy 4-tuple (consumer key/secret + access token/secret).
 * OAuth 2.0 app-only bearer tokens can read but not post. See:
 *   https://developer.x.com/en/docs/authentication/oauth-1-0a
 *
 * Endpoint: POST https://api.x.com/2/tweets
 *   body: { text: string } (application/json)
 *
 * Character limit: 280. X wraps URLs via t.co to a fixed 23-char
 * length for display but the raw request body still has to fit 280 —
 * `composeMessage` is conservative and treats the URL at its real
 * length, which only ever under-uses the budget.
 *
 * Free tier quota: ~1,500 posts/month at the time of writing.
 */

const API_URL = 'https://api.x.com/2/tweets';
const TEXT_LIMIT = 280;

function getCreds(): OAuth1Credentials | null {
  const consumerKey = process.env.X_API_KEY;
  const consumerSecret = process.env.X_API_KEY_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) return null;
  return { consumerKey, consumerSecret, accessToken, accessTokenSecret };
}

export const x: Adapter = {
  name: 'x',
  isConfigured() {
    return getCreds() !== null;
  },
  async publish(post: SyndicationPost): Promise<AdapterResult> {
    const creds = getCreds();
    if (!creds) return { status: 'skipped', reason: 'credentials missing' };

    const text = composeMessage(post, TEXT_LIMIT);

    // POST /2/tweets with a JSON body. The body is NOT signed (see
    // oauth1.ts header comment) — signature base string uses only the
    // HTTP method, URL, and oauth_* params.
    const authHeader = buildOAuth1Header('POST', API_URL, {}, creds);

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
      return { status: 'error', error: `network error: ${(err as Error).message}` };
    }

    if (!res.ok) {
      // X returns JSON errors like { title, detail, errors: [...] }.
      // Surface just enough to debug from the webhook log without
      // leaking the whole response body. 429 comes back with an
      // `x-rate-limit-reset` header — include it so the operator can
      // see when the free-tier window reopens.
      let detail = `${res.status} ${res.statusText}`;
      try {
        const body = (await res.json()) as { detail?: string; title?: string };
        if (body.detail) detail = `${res.status} ${body.detail}`;
        else if (body.title) detail = `${res.status} ${body.title}`;
      } catch {
        // body wasn't JSON — stick with statusText
      }
      if (res.status === 429) {
        const reset = res.headers.get('x-rate-limit-reset');
        if (reset) detail = `${detail} (reset at ${new Date(Number(reset) * 1000).toISOString()})`;
      }
      return { status: 'error', error: detail };
    }

    const body = (await res.json()) as { data?: { id?: string; text?: string } };
    const id = body.data?.id;
    if (!id) {
      return { status: 'error', error: 'response missing data.id' };
    }

    // X doesn't return the canonical web URL; the `/i/web/status/<id>`
    // form always resolves even without knowing the handle.
    return { status: 'ok', id, url: `https://x.com/i/web/status/${id}` };
  },
};
