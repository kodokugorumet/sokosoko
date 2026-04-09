import type { MetadataRoute } from 'next';

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /search produces user-driven result pages that have no canonical
        // value and would burn crawl budget on duplicate listings.
        // /login, /onboarding, /auth/* are auth flow pages — no SEO value
        // and personalised state, so keep crawlers off them.
        // /admin/* is operator-only; RLS blocks anonymous reads anyway
        // but it's still better to keep it out of the crawl graph.
        // /p/* is the legacy Supabase interim URL that 308-redirects to
        // the pretty `/[board]/[slug]` form; Google handles redirects
        // fine but explicitly disallowing keeps it out of sitemap noise.
        disallow: [
          '/auth/',
          '/login',
          '/*/login',
          '/onboarding',
          '/*/onboarding',
          '/admin',
          '/admin/',
          '/*/admin',
          '/*/admin/',
          '/search',
          '/*/search',
          '/p/',
          '/*/p/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
