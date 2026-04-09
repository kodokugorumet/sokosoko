import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

/**
 * Localised 404 for routes under `/[locale]`. Server component — reads
 * the current request locale explicitly via `getLocale()` and passes it
 * to `getTranslations()`, because when `notFound()` is called from a
 * nested Server Component the implicit request-context locale is not
 * always propagated through the error boundary, causing the fallback to
 * render in whatever next-intl's default locale is (ko in our routing
 * config) regardless of the URL.
 *
 * KNOWN LIMITATION: the HTTP status on this page is currently 200 in
 * production, not 404, because of a well-documented interaction
 * between next-intl's middleware and Next.js 16 App Router streaming.
 * When any middleware returns `NextResponse.next()` (which next-intl
 * does for every page route), the response status is locked to 200
 * before the page Server Component has a chance to throw notFound().
 * See: https://github.com/vercel/next.js/discussions/76501
 *
 * Because the status is wrong, we mark the page `robots: noindex` so
 * Google doesn't index the 200-with-404-body as a duplicate of the
 * real page. Readers still see the right content; crawlers are told
 * via meta that this isn't a real page. When Next.js or next-intl
 * upstream fix the status issue this metadata can stay — noindex on a
 * 404 is correct either way.
 *
 * Next.js falls back to the root `/not-found.tsx` when this file isn't
 * matched (e.g. non-locale paths like `/api/*`).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function LocaleNotFound() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'NotFound' });
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-hand text-7xl tracking-wider text-[var(--accent)] sm:text-8xl">404</p>
      <h1 className="font-hand mt-4 mb-4 text-3xl tracking-wide text-[var(--ink)] sm:text-4xl">
        {t('heading')}
      </h1>
      <p className="mb-8 max-w-md text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-400">
        {t('body')}
      </p>
      <Link
        href="/"
        className="inline-block rounded-md border border-[var(--border)] bg-[var(--background)] px-6 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent)] hover:text-white"
      >
        {t('backHome')}
      </Link>
    </div>
  );
}
