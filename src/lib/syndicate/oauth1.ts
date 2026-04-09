import { createHmac, randomBytes } from 'node:crypto';

/**
 * Minimal OAuth 1.0a signer for the X (Twitter) v2 API's user-context
 * write endpoints. Deliberately implemented from scratch — the whole
 * algorithm is under 80 lines and pulling in a 1 MB OAuth library for
 * one endpoint felt wasteful.
 *
 * Spec: RFC 5849 (OAuth 1.0 Protocol), §3.4 Signature.
 *
 * Notes specific to X v2 + JSON body:
 *   - The JSON request body is **not** included in the signature base
 *     string. Only the HTTP method, URL, and OAuth params are signed.
 *     This is because the body is application/json, not form-encoded —
 *     RFC 5849 §3.4.1.3.1 only folds entity bodies into the base string
 *     when the content-type is application/x-www-form-urlencoded.
 *   - Percent-encoding follows RFC 3986 (unreserved = A-Z a-z 0-9 -_.~).
 *     `encodeURIComponent` is *almost* correct but leaves `!*'()` alone;
 *     we fix those below.
 */

export type OAuth1Credentials = {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
};

/** RFC 3986 percent-encoding — stricter than encodeURIComponent. */
function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!*'()]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function nonce(): string {
  // 32 hex chars is plenty — X just needs it unique per request per
  // nonce-window. Randomness source is Node's crypto, not Math.random.
  return randomBytes(16).toString('hex');
}

/**
 * Build the `Authorization: OAuth ...` header value for a signed
 * request. `method` is uppercased per the spec; `url` must be the
 * full URL including scheme+host+path (no query string — pass query
 * params as `queryParams`).
 *
 * `overrides` is for tests only — in production the nonce and
 * timestamp are generated fresh every call.
 */
export function buildOAuth1Header(
  method: string,
  url: string,
  queryParams: Record<string, string>,
  creds: OAuth1Credentials,
  overrides?: { nonce?: string; timestamp?: string },
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.consumerKey,
    oauth_nonce: overrides?.nonce ?? nonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: overrides?.timestamp ?? Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: '1.0',
  };

  // §3.4.1.3 — merge oauth params + query params (body params excluded
  // for JSON requests), percent-encode each key/value, sort by encoded
  // key (then by encoded value on ties), and join as k=v&k=v.
  const allParams: Array<[string, string]> = [
    ...Object.entries(oauthParams),
    ...Object.entries(queryParams),
  ].map(([k, v]) => [percentEncode(k), percentEncode(v)]);
  allParams.sort(([ak, av], [bk, bv]) => (ak === bk ? (av < bv ? -1 : 1) : ak < bk ? -1 : 1));
  const paramString = allParams.map(([k, v]) => `${k}=${v}`).join('&');

  // §3.4.1.1 — base string = METHOD & encoded URL & encoded param string
  const baseString = [method.toUpperCase(), percentEncode(url), percentEncode(paramString)].join(
    '&',
  );

  // §3.4.2 — signing key = encoded consumer secret & encoded token secret
  const signingKey = `${percentEncode(creds.consumerSecret)}&${percentEncode(creds.accessTokenSecret)}`;
  const signature = createHmac('sha1', signingKey).update(baseString).digest('base64');

  // §3.5.1 — Authorization header is the oauth_* params only,
  // comma-separated, values in double quotes.
  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  const headerValue = Object.entries(headerParams)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(', ');

  return `OAuth ${headerValue}`;
}
