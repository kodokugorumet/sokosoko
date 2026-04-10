import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Supabase Storage public URLs. The project's ref is variable per
      // environment, so we wildcard the subdomain and scope to
      // `/storage/v1/object/public/**` — everything under that is a
      // publicly readable bucket object, gated by the bucket's Storage
      // RLS policies. Nothing else the project might serve (Realtime
      // WebSocket, Functions, etc.) matches this URL shape, so the
      // whitelist stays tight.
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
