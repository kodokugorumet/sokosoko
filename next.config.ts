import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // No remotePatterns yet — Phase 2-F removed the Sanity CDN whitelist,
  // and Supabase Storage URLs are not yet wired through next/image
  // (rendered via plain <img> tags for now, with an eslint-disable hint
  // at each usage site pointing at this note). Phase 2-G will add the
  // Supabase project's storage host here and swap the <img> tags for
  // next/image for the automatic optimisation pipeline.
};

export default withNextIntl(nextConfig);
