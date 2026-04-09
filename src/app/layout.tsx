import type { Metadata } from 'next';
import { Noto_Sans_JP, Noto_Sans_KR, Klee_One, Gaegu } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';

// GA4 measurement ID is optional — when unset (local dev, preview
// deploys without secrets) we omit the script entirely instead of
// injecting an empty value that would confuse Google's crawler.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Google Search Console ownership verification. The token is
// deliberately hardcoded (not env-driven) because it's a public
// fingerprint tied to *this* site and must match the property the
// operator registered in GSC — making it an env var introduces a
// class of "token present but wrong" failure modes with no upside.
// If this site is ever cloned for another domain, swap the value.
// The env var is still honoured as an override for staging/preview
// deploys that want to verify a different GSC property.
const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? 'ut9EzQGN76JHCxawYqfe8f1lysgx8uf0ngBMLlN9QTo';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
});

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
});

// Handwriting display fonts (used only for brand wordmark / hero / labels).
const kleeOne = Klee_One({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-klee-one',
  display: 'swap',
});

const gaegu = Gaegu({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-gaegu',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '釜山暮らし。いもじょも',
  description: '釜山で暮らす・学ぶ・旅する、等身大のリアル',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  verification: { google: GOOGLE_SITE_VERIFICATION },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ja"
      className={`${notoSansJP.variable} ${notoSansKR.variable} ${kleeOne.variable} ${gaegu.variable} h-full`}
    >
      <body className="flex min-h-full flex-col antialiased">{children}</body>
      {GA_MEASUREMENT_ID ? <GoogleAnalytics gaId={GA_MEASUREMENT_ID} /> : null}
    </html>
  );
}
