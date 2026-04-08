import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

/**
 * Localised 404 for routes under `/[locale]`. Server component — uses
 * the current request locale via `getTranslations` so the back-home link
 * and copy stay in the same language as the surrounding site chrome.
 *
 * Next.js falls back to the root `/not-found.tsx` when this file isn't
 * matched (e.g. non-locale paths like `/api/*`).
 */
export default async function LocaleNotFound() {
  const t = await getTranslations('NotFound');
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
