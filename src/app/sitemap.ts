import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { listAllPublishedPostSlugs, listAllQuestionSlugs } from '@/lib/posts/queries';
import { isSupabaseConfigured } from '@/lib/supabase/server';

// Static paths that always exist for every locale.
const STATIC_PATHS = ['', '/about', '/contact', '/qa', '/community'] as const;
// Article board index pages — these exist regardless of post count;
// empty-state handles the "no posts yet" case but the URL is still
// canonical and worth indexing.
const PILLAR_PATHS = ['/life', '/study', '/trip'] as const;
// Community board slugs that get their own index in the sitemap.
// When a new board is added via SQL, add it here too.
const COMMUNITY_BOARD_SLUGS = ['free'] as const;

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

  // Both post and question lists come from Supabase now. When Supabase
  // env vars are missing (CI builds with dummy config) the calls are
  // skipped entirely rather than throwing, and the sitemap still lists
  // every static + pillar path so crawlers have something to chew on.
  const [posts, questions] = isSupabaseConfigured()
    ? await Promise.all([
        listAllPublishedPostSlugs().catch((err) => {
          console.error('[sitemap] listAllPublishedPostSlugs failed', err);
          return [];
        }),
        listAllQuestionSlugs().catch((err) => {
          console.error('[sitemap] listAllQuestionSlugs failed', err);
          return [];
        }),
      ])
    : [[], []];

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

  const communityBoardEntries: MetadataRoute.Sitemap = COMMUNITY_BOARD_SLUGS.flatMap((slug) => {
    const path = `/community/${slug}`;
    return routing.locales.map((locale) => ({
      url: urlFor(locale, path),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
      alternates: alternatesFor(path),
    }));
  });

  // Separate community board posts from pillar posts. Community posts
  // live under /community/[board]/[slug]; pillar posts live at
  // /[board]/[slug]. Q&A posts use /qa/[slug] below.
  const communityBoardSlugsSet = new Set<string>(COMMUNITY_BOARD_SLUGS);

  const postEntries: MetadataRoute.Sitemap = posts.flatMap((post) => {
    if (!post.board_slug || !post.slug) return [];
    if (post.board_slug === 'qa') return [];
    const isCommunity = communityBoardSlugsSet.has(post.board_slug);
    const path = isCommunity
      ? `/community/${post.board_slug}/${encodeURIComponent(post.slug)}`
      : `/${post.board_slug}/${encodeURIComponent(post.slug)}`;
    return routing.locales.map((locale) => ({
      url: urlFor(locale, path),
      lastModified: post.updated_at ? new Date(post.updated_at) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      alternates: alternatesFor(path),
    }));
  });

  const questionEntries: MetadataRoute.Sitemap = questions.flatMap((q) => {
    if (!q.slug) return [];
    const path = `/qa/${encodeURIComponent(q.slug)}`;
    const lastMod = q.updated_at ?? q.published_at;
    return routing.locales.map((locale) => ({
      url: urlFor(locale, path),
      lastModified: lastMod ? new Date(lastMod) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
      alternates: alternatesFor(path),
    }));
  });

  return [
    ...staticEntries,
    ...pillarEntries,
    ...communityBoardEntries,
    ...postEntries,
    ...questionEntries,
  ];
}
