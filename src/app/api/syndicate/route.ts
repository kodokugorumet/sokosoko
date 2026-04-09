import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook';
import type { NextRequest } from 'next/server';
import { dispatchSyndication, type SyndicationPost } from '@/lib/syndicate';

/**
 * Sanity → SNS auto-syndication webhook.
 *
 * This is intentionally a SEPARATE webhook from `/api/revalidate`:
 *   - Different secret (`SANITY_SYNDICATE_SECRET`) so it can be rotated
 *     or disabled without touching the cache invalidation path.
 *   - Different filter — should only fire on **Create** of a `post`
 *     document with a non-null `publishedAt`, so editing an existing
 *     post does not double-syndicate.
 *
 * Configure in manage.sanity.io → API → Webhooks:
 *   - URL:        https://<deployment>/api/syndicate
 *   - Trigger on: Create  ✅   (Update / Delete: OFF)
 *   - Filter:     _type == "post" && defined(publishedAt) && !(_id in path("drafts.**"))
 *   - Projection: {
 *                   _id,
 *                   "slug": slug.current,
 *                   "pillar": category->pillar,
 *                   title,
 *                   excerpt
 *                 }
 *   - Secret:     value of SANITY_SYNDICATE_SECRET
 *
 * See `docs/runbooks/sns-syndication.md` for the full setup.
 */

const SECRET = process.env.SANITY_SYNDICATE_SECRET;
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

type Bilingual = { ja?: string; ko?: string };

type SanityPostWebhookBody = {
  _id?: string;
  slug?: string | null;
  pillar?: string | null;
  title?: Bilingual;
  excerpt?: Bilingual;
};

export async function POST(req: NextRequest) {
  if (!SECRET) {
    return Response.json(
      { ok: false, error: 'SANITY_SYNDICATE_SECRET is not set on the server' },
      { status: 500 },
    );
  }

  // Read raw body — `isValidSignature` hashes exact bytes.
  const rawBody = await req.text();
  const signature = req.headers.get(SIGNATURE_HEADER_NAME);
  if (!signature) {
    return Response.json({ ok: false, error: 'Missing signature header' }, { status: 401 });
  }
  const valid = await isValidSignature(rawBody, signature, SECRET);
  if (!valid) {
    return Response.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
  }

  let body: SanityPostWebhookBody;
  try {
    body = JSON.parse(rawBody) as SanityPostWebhookBody;
  } catch {
    return Response.json({ ok: false, error: 'Body is not valid JSON' }, { status: 400 });
  }

  // Validate the projection — anything missing here means the webhook
  // is misconfigured. Surface that loudly in the response so the
  // operator sees it in the Sanity webhook log.
  if (!body._id || !body.slug || !body.pillar || !body.title) {
    return Response.json(
      {
        ok: false,
        error: 'Missing required fields (_id / slug / pillar / title) — check webhook projection',
        received: body,
      },
      { status: 400 },
    );
  }

  const post: SyndicationPost = {
    id: body._id,
    slug: body.slug,
    pillar: body.pillar,
    title: body.title,
    excerpt: body.excerpt,
    url: `${SITE_URL}/${body.pillar}/${body.slug}`,
  };

  const results = await dispatchSyndication(post);

  // The route always responds 200 even if individual adapters errored
  // — the webhook itself succeeded; per-platform success is in the
  // `results` array. This keeps Sanity's retry logic from spamming
  // the endpoint over a single broken platform.
  return Response.json({ ok: true, post: { id: post.id, url: post.url }, results });
}
