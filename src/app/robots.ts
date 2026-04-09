import type { MetadataRoute } from 'next';

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /studio is the embedded Sanity admin — should never be indexed.
        // /search produces user-driven result pages that have no canonical
        // value and would burn crawl budget on duplicate listings.
        disallow: ['/studio', '/api/', '/search', '/*/search'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
