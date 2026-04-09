'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

/**
 * Locale-aware search input. Submits to /search?q=... — the locale prefix
 * is added by next-intl's `useRouter`. Used inside the menu drawer so the
 * header itself stays minimal.
 *
 * `onSubmitted` lets the parent close the drawer once the user dispatches
 * a search; without it the drawer would stay open over the results page.
 */
export function SearchBox({ onSubmitted }: { onSubmitted?: () => void }) {
  const t = useTranslations('Search');
  const router = useRouter();
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    onSubmitted?.();
  };

  return (
    <form onSubmit={handleSubmit} role="search" className="flex items-center gap-2">
      <label htmlFor="site-search-input" className="sr-only">
        {t('label')}
      </label>
      <input
        id="site-search-input"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('placeholder')}
        autoComplete="off"
        className="hand-box w-full flex-1 rounded-md bg-[var(--background)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-zinc-400 focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
      />
      <button
        type="submit"
        className="hand-box rounded-md px-3 py-2 text-xs font-medium tracking-wide whitespace-nowrap hover:bg-[var(--accent-soft)]"
      >
        {t('submit')}
      </button>
    </form>
  );
}
