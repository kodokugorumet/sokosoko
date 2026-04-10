import { createHmac, randomBytes } from 'node:crypto';

/**
 * Minimal OAuth 1.0a signer for the X (Twitter) v2 API. Hand-rolled
 * from RFC 5849 — the whole thing is ~60 lines and pulling in a 1 MB
 * SDK for one endpoint isn't worth it.
 *
 * JSON body is NOT included in the signature base string per
 * RFC 5849 §3.4.1.3.1 (only form-encoded bodies fold in).
 */

export type OAuth1Creds = {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
};

function percentEncode(v: string): string {
  return encodeURIComponent(v).replace(
    /[!*'()]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

export function buildOAuth1Header(method: string, url: string, creds: OAuth1Creds): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.consumerKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: '1.0',
  };

  const allParams = Object.entries(oauthParams)
    .map(([k, v]) => [percentEncode(k), percentEncode(v)] as [string, string])
    .sort(([ak], [bk]) => (ak < bk ? -1 : 1));
  const paramString = allParams.map(([k, v]) => `${k}=${v}`).join('&');
  const baseString = [method.toUpperCase(), percentEncode(url), percentEncode(paramString)].join(
    '&',
  );
  const signingKey = `${percentEncode(creds.consumerSecret)}&${percentEncode(creds.accessTokenSecret)}`;
  const signature = createHmac('sha1', signingKey).update(baseString).digest('base64');

  const headerParams = { ...oauthParams, oauth_signature: signature };
  return (
    'OAuth ' +
    Object.entries(headerParams)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
      .join(', ')
  );
}
