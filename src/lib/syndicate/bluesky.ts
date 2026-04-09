import type { Adapter, AdapterResult, SyndicationPost } from './types';
import { composeMessage } from './compose';

/**
 * Bluesky (AT Protocol) adapter.
 *
 * Uses the public XRPC endpoints directly via `fetch` so we don't drag
 * in the @atproto/api SDK (~200 KB) just to call two endpoints.
 *
 * Auth flow (per https://docs.bsky.app/docs/get-started):
 *   1. POST com.atproto.server.createSession  → accessJwt + did
 *   2. POST com.atproto.repo.createRecord     → record uri
 *
 * Use an **App Password** (Settings → Privacy and Security → App
 * Passwords), never the account password — this is enforced by the
 * server but doubly important since the value sits in env vars.
 *
 * Bluesky's hard text limit is 300 graphemes; we pass a small safety
 * margin so multi-byte CJK doesn't trip us up at the boundary.
 */

const BSKY_HOST = 'https://bsky.social';
const TEXT_LIMIT = 290;

type CreateSessionResponse = {
  accessJwt: string;
  did: string;
};

type CreateRecordResponse = {
  uri: string;
  cid: string;
};

async function createSession(identifier: string, password: string): Promise<CreateSessionResponse> {
  const res = await fetch(`${BSKY_HOST}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`createSession ${res.status}: ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as CreateSessionResponse;
}

async function createPostRecord(
  did: string,
  accessJwt: string,
  text: string,
  langs: string[],
): Promise<CreateRecordResponse> {
  const res = await fetch(`${BSKY_HOST}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessJwt}`,
    },
    body: JSON.stringify({
      repo: did,
      collection: 'app.bsky.feed.post',
      record: {
        $type: 'app.bsky.feed.post',
        text,
        createdAt: new Date().toISOString(),
        langs,
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`createRecord ${res.status}: ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as CreateRecordResponse;
}

/**
 * Convert an AT Protocol record URI (`at://did:plc:xxx/app.bsky.feed.post/rkey`)
 * into the public bsky.app URL the operator can click to verify the post.
 */
function publicUrlForRecord(identifier: string, recordUri: string): string | undefined {
  const rkey = recordUri.split('/').pop();
  if (!rkey) return undefined;
  return `https://bsky.app/profile/${identifier}/post/${rkey}`;
}

export const bluesky: Adapter = {
  name: 'bluesky',
  isConfigured() {
    return Boolean(process.env.BLUESKY_IDENTIFIER && process.env.BLUESKY_APP_PASSWORD);
  },
  async publish(post: SyndicationPost): Promise<AdapterResult> {
    const identifier = process.env.BLUESKY_IDENTIFIER;
    const password = process.env.BLUESKY_APP_PASSWORD;
    if (!identifier || !password) {
      return { status: 'skipped', reason: 'BLUESKY_IDENTIFIER / BLUESKY_APP_PASSWORD not set' };
    }

    const text = composeMessage(post, TEXT_LIMIT);
    // Tag both languages so feed clients can filter / show the right
    // language preview. Order doesn't matter on the wire.
    const langs = [post.title.ja ? 'ja' : null, post.title.ko ? 'ko' : null].filter(
      (v): v is string => v !== null,
    );

    try {
      const session = await createSession(identifier, password);
      const record = await createPostRecord(
        session.did,
        session.accessJwt,
        text,
        langs.length > 0 ? langs : ['ja'],
      );
      return {
        status: 'ok',
        id: record.uri,
        url: publicUrlForRecord(identifier, record.uri),
      };
    } catch (err) {
      return { status: 'error', error: (err as Error).message };
    }
  },
};
