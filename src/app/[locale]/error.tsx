'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Route-level error boundary for `/[locale]/*`. Must be a Client
 * Component per Next.js App Router rules. Rendered when a Server
 * Component throws during rendering (including Supabase network
 * blips and unexpected query errors not caught by the page's own
 * .catch handlers).
 *
 * `reset()` re-runs the offending segment — handy for transient network
 * blips. We also log to the browser console so issues triaged via
 * Vercel's runtime logs are easier to correlate.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('ErrorPage');

  useEffect(() => {
    console.error('[app-error]', error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-hand text-6xl tracking-wider text-[var(--accent)] sm:text-7xl">…oops</p>
      <h1 className="font-hand mt-4 mb-4 text-3xl tracking-wide text-[var(--ink)] sm:text-4xl">
        {t('heading')}
      </h1>
      <p className="mb-6 max-w-md text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-400">
        {t('body')}
      </p>
      {error.digest ? (
        <p className="mb-6 font-mono text-xs text-zinc-400">#{error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="inline-block rounded-md border border-[var(--border)] bg-[var(--background)] px-6 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent)] hover:text-white"
      >
        {t('retry')}
      </button>
    </div>
  );
}
