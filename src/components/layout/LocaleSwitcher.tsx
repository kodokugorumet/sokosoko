'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

export function LocaleSwitcher() {
  const t = useTranslations('LocaleSwitcher');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="relative inline-flex items-center gap-2 text-sm">
      <span className="sr-only">{t('label')}</span>
      <select
        defaultValue={locale}
        disabled={isPending}
        onChange={(event) => {
          const next = event.target.value as Locale;
          startTransition(() => {
            router.replace(pathname, { locale: next });
          });
        }}
        className="cursor-pointer rounded-full border border-zinc-300 bg-transparent px-3 py-1 text-xs font-medium transition-colors hover:border-[var(--accent)] focus:border-[var(--accent)] focus:outline-none dark:border-zinc-700"
      >
        {routing.locales.map((cur) => (
          <option key={cur} value={cur}>
            {t(cur)}
          </option>
        ))}
      </select>
    </label>
  );
}
