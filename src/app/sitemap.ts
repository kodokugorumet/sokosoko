import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

// Static routes that exist for every locale. Phase C will extend this with
// dynamic Sanity post slugs (one entry per published post per locale).
const STATIC_PATHS = ['', '/about', '/contact', '/qa'] as const;

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

// next-intl `as-needed` prefix: the default locale (ja) lives at `/`, others
// at `/{locale}`. Build the canonical URL accordingly.
function urlFor(locale: string, path: string) {
  if (locale === routing.defaultLocale) return `${baseUrl}${path || '/'}`;
  return `${baseUrl}/${locale}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return STATIC_PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: urlFor(locale, path),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, urlFor(l, path)])),
      },
    })),
  );
}
