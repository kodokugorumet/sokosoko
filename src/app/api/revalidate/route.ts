import { revalidateTag } from 'next/cache';
import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook';
import type { NextRequest } from 'next/server';

/**
 * Sanity GROQ-Powered Webhook receiver.
 *
 * Configure in manage.sanity.io → API → Webhooks:
 *   - URL:        https://<deployment>/api/revalidate
 *   - Trigger on: Create / Update / Delete
 *   - Filter:     _type in ["post","category","author","question"]
 *   - Projection: {
 *                   _type,
 *                   "slug": slug.current,
 *                   "pillar": coalesce(pillar, category->pillar)
 *                 }
 *   - Secret:     value of SANITY_REVALIDATE_SECRET (matches the env var)
 *
 * The handler verifies the HMAC signature, then calls revalidateTag for the
 * tags our pillar/post pages use (see sanity/lib/fetch.ts and the page-level
 * `tags` arrays). Tagging is intentionally narrow so we only invalidate the
 * pages that actually need to refresh.
 */

const SECRET = process.env.SANITY_REVALIDATE_SECRET;

type SanityWebhookBody = {
  _type?: string;
  slug?: string | null;
  pillar?: string | null;
};

export async function POST(req: NextRequest) {
  if (!SECRET) {
    return Response.json(
      { ok: false, error: 'SANITY_REVALIDATE_SECRET is not set on the server' },
      { status: 500 },
    );
  }

  // We must read the raw body text — `isValidSignature` hashes the exact bytes
  // Sanity sent. Don't pre-parse with .json().
  const rawBody = await req.text();
  const signature = req.headers.get(SIGNATURE_HEADER_NAME);

  if (!signature) {
    return Response.json({ ok: false, error: 'Missing signature header' }, { status: 401 });
  }

  const valid = await isValidSignature(rawBody, signature, SECRET);
  if (!valid) {
    return Response.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
  }

  let body: SanityWebhookBody;
  try {
    body = JSON.parse(rawBody) as SanityWebhookBody;
  } catch {
    return Response.json({ ok: false, error: 'Body is not valid JSON' }, { status: 400 });
  }

  // Always-on broad tag — every post-related fetch is tagged with this.
  const revalidated: string[] = [];
  const tag = (t: string) => {
    // Next.js 16: second arg required. 'max' = purge entries of any age,
    // which is what we want when Sanity says content actually changed.
    revalidateTag(t, 'max');
    revalidated.push(t);
  };

  tag('sanity');

  // Route the invalidation by document type: post-ish types share the
  // `post` tag, questions have their own so we don't nuke article caches
  // when only the Q&A changes.
  if (body._type === 'question') {
    tag('question');
    if (body.slug) tag(`question:${body.slug}`);
  } else {
    tag('post');
    if (body.pillar) tag(`pillar:${body.pillar}`);
    if (body.slug) tag(`post:${body.slug}`);
  }

  return Response.json({ ok: true, revalidated });
}
