// Verification script: reproduces Twitter's canonical OAuth 1.0a
// example from https://developer.twitter.com/en/docs/authentication/oauth-1-0a/authorizing-a-request
// and https://oauth1.wp-api.org/docs/basics/Signing.html — both use
// the same well-known test vector.
//
// This is a one-shot sanity check, not a unit test — run it with:
//   node scripts/verify-oauth1.mjs
//
// Expected signature (from Twitter's docs): hCtSmYh+iHYCEqBWrE7C7hYmtUk=

import { createHmac } from 'node:crypto';

function percentEncode(value) {
  return encodeURIComponent(value).replace(
    /[!*'()]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

const method = 'POST';
const url = 'https://api.twitter.com/1.1/statuses/update.json';

// The Twitter example uses form-encoded body params which fold into
// the signature base string. We pass them via `queryParams` since our
// signer treats query + oauth params identically after sorting.
const params = {
  status: 'Hello Ladies + Gentlemen, a signed OAuth request!',
  include_entities: 'true',
  oauth_consumer_key: 'xvz1evFS4wEEPTGEFPHBog',
  oauth_nonce: 'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg',
  oauth_signature_method: 'HMAC-SHA1',
  oauth_timestamp: '1318622958',
  oauth_token: '370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb',
  oauth_version: '1.0',
};

const allParams = Object.entries(params).map(([k, v]) => [percentEncode(k), percentEncode(v)]);
allParams.sort(([ak, av], [bk, bv]) => (ak === bk ? (av < bv ? -1 : 1) : ak < bk ? -1 : 1));
const paramString = allParams.map(([k, v]) => `${k}=${v}`).join('&');

const baseString = [method, percentEncode(url), percentEncode(paramString)].join('&');

const consumerSecret = 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw';
const accessTokenSecret = 'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE';
const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;

const signature = createHmac('sha1', signingKey).update(baseString).digest('base64');

const expected = 'hCtSmYh+iHYCEqBWrE7C7hYmtUk=';
console.log('base string:', baseString);
console.log('signing key:', signingKey);
console.log('computed:   ', signature);
console.log('expected:   ', expected);
console.log(signature === expected ? '✅ MATCH' : '❌ MISMATCH');
process.exit(signature === expected ? 0 : 1);
