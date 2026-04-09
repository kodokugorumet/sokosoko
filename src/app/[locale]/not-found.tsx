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
 * Next.js falls back to the root `/not-found.tsx` when this file isn't
 * matched (e.g. non-locale paths like `/api/*`).
 */
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
