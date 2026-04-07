'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

/**
 * Native <select> dropdown styled to match the hand-drawn aesthetic.
 * Used in the header (next to LOG IN / MENU) and inside the menu drawer.
 */
export function LocaleSwitcher({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const t = useTranslations('LocaleSwitcher');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const padding = size === 'md' ? 'px-3 py-1.5 pr-7 text-sm' : 'px-2 py-1 pr-6 text-[11px]';

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t('label')}</span>
      <select
        value={locale}
        disabled={isPending}
        onChange={(event) => {
          const next = event.target.value as Locale;
          startTransition(() => {
            router.replace(pathname, { locale: next });
          });
        }}
        className={`hand-box ${padding} cursor-pointer appearance-none rounded-md bg-[var(--background)] font-medium tracking-wide hover:bg-[var(--accent-soft)] focus:outline-none disabled:opacity-50`}
      >
        {routing.locales.map((cur) => (
          <option key={cur} value={cur}>
            {cur === 'ja' ? 'JA' : 'KO'}
          </option>
        ))}
      </select>
      {/* Caret */}
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-1.5 h-3 w-3 text-[var(--ink)]"
      >
        <path
          d="M2 4 L6 8 L10 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </label>
  );
}
