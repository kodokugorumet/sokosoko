import { defineQuery } from 'next-sanity';

/**
 * Reusable GROQ queries.
 *
 * `defineQuery` is a no-op tag that lets the future `sanity typegen` step
 * pick up these strings and emit precise TS types. For now we declare the
 * shapes manually below.
 *
 * Conventions:
 * - All post lookups filter `defined(slug.current)` and `!(_id in path("drafts.**"))`
 *   so drafts never leak to the public site.
 * - All bilingual fields (`title`, `excerpt`, ...) are returned as full
 *   `{ ja, ko }` objects; the page picks the locale at render time.
 * - `category->{ ... }` and `author->{ ... }` dereference the references
 *   inline so the page only needs one round-trip.
 */

const POST_FIELDS = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  coverImage,
  category->{
    _id,
    pillar,
    title,
    "slug": slug.current
  },
  author->{
    _id,
    name,
    tier,
    "slug": slug.current
  }
`;

/** All published posts in a given pillar (`life` | `study` | `trip`), newest first. */
export const POSTS_BY_PILLAR_QUERY = defineQuery(`
  *[
    _type == "post"
    && defined(slug.current)
    && !(_id in path("drafts.**"))
    && category->pillar == $pillar
  ] | order(publishedAt desc) {
    ${POST_FIELDS}
  }
`);

/** Single post by slug, with full body for both locales. */
export const POST_BY_SLUG_QUERY = defineQuery(`
  *[
    _type == "post"
    && slug.current == $slug
    && !(_id in path("drafts.**"))
  ][0] {
    ${POST_FIELDS},
    bodyJa,
    bodyKo
  }
`);

/** Categories within a pillar, ordered by `order` field then title. */
export const CATEGORIES_BY_PILLAR_QUERY = defineQuery(`
  *[
    _type == "category"
    && pillar == $pillar
    && !(_id in path("drafts.**"))
  ] | order(order asc, title.ja asc) {
    _id,
    pillar,
    title,
    "slug": slug.current,
    description,
    order
  }
`);

/** Slugs of all published posts (for generateStaticParams). */
export const ALL_POST_SLUGS_QUERY = defineQuery(`
  *[
    _type == "post"
    && defined(slug.current)
    && !(_id in path("drafts.**"))
  ]{
    "slug": slug.current,
    "pillar": category->pillar
  }
`);

// ----- Result types (manual; replace with sanity typegen output later) -----

export type Bilingual = { ja?: string; ko?: string };
export type Pillar = 'life' | 'study' | 'trip';
export type AuthorTier = 'crown' | 'apple' | 'contributor';

export type CategoryRef = {
  _id: string;
  pillar: Pillar;
  title: Bilingual;
  slug: string;
};

export type AuthorRef = {
  _id: string;
  name: Bilingual;
  tier: AuthorTier;
  slug: string;
};

export type PostCard = {
  _id: string;
  title: Bilingual;
  slug: string;
  excerpt?: Bilingual;
  publishedAt: string;
  coverImage?: { asset?: { _ref: string } };
  category: CategoryRef;
  author: AuthorRef;
};

export type PostDetail = PostCard & {
  // Portable Text — left as `unknown[]` until we wire @portabletext/react in C-3
  bodyJa?: unknown[];
  bodyKo?: unknown[];
};

export type Category = CategoryRef & {
  description?: Bilingual;
  order?: number;
};

export type PostSlug = {
  slug: string;
  pillar: Pillar;
};
