import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { sanityFetch } from '../../sanity/lib/fetch';
import {
  ALL_POST_SLUGS_QUERY,
  ALL_QUESTION_SLUGS_QUERY,
  type PostSlug,
  type QuestionSlug,
  type Pillar,
} from '../../sanity/lib/queries';

// Static paths that always exist for every locale.
const STATIC_PATHS = ['', '/about', '/contact', '/qa'] as const;
// Pillar index pages — these exist regardless of post count; empty-state
// handles the "no posts yet" case but the URL is still canonical.
const PILLAR_PATHS: ReadonlyArray<`/${Pillar}`> = ['/life', '/study', '/trip'];

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

// next-intl `as-needed` prefix: the default locale (ja) lives at `/`, others
// at `/{locale}`. Build the canonical URL accordingly.
function urlFor(locale: string, path: string) {
  if (locale === routing.defaultLocale) return `${baseUrl}${path || '/'}`;
  return `${baseUrl}/${locale}${path}`;
}

function alternatesFor(path: string) {
  return {
    languages: Object.fromEntries(routing.locales.map((l) => [l, urlFor(l, path)])),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Parallel fetches for every published post and question. Tagged with
  // the same `post`/`question` tags the webhook uses so sitemap.xml gets
  // invalidated alongside the page routes.
  const [posts, questions] = await Promise.all([
    sanityFetch<PostSlug[]>({
      query: ALL_POST_SLUGS_QUERY,
      tags: ['post', 'sitemap'],
    }),
    sanityFetch<QuestionSlug[]>({
      query: ALL_QUESTION_SLUGS_QUERY,
      tags: ['question', 'sitemap'],
    }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: urlFor(locale, path),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.7,
      alternates: alternatesFor(path),
    })),
  );

  const pillarEntries: MetadataRoute.Sitemap = PILLAR_PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: urlFor(locale, path),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
      alternates: alternatesFor(path),
    })),
  );

  const postEntries: MetadataRoute.Sitemap = posts.flatMap((post) => {
    // Drop posts whose category has no pillar (should be impossible given
    // the schema's required radio, but better than emitting a bad URL).
    if (!post.pillar || !post.slug) return [];
    const path = `/${post.pillar}/${post.slug}`;
    const lastMod = post._updatedAt ?? post.publishedAt;
    return routing.locales.map((locale) => ({
      url: urlFor(locale, path),
      lastModified: lastMod ? new Date(lastMod) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      alternates: alternatesFor(path),
    }));
  });

  const questionEntries: MetadataRoute.Sitemap = questions.flatMap((q) => {
    if (!q.slug) return [];
    const path = `/qa/${q.slug}`;
    const lastMod = q._updatedAt ?? q.askedAt;
    return routing.locales.map((locale) => ({
      url: urlFor(locale, path),
      lastModified: lastMod ? new Date(lastMod) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
      alternates: alternatesFor(path),
    }));
  });

  return [...staticEntries, ...pillarEntries, ...postEntries, ...questionEntries];
}
