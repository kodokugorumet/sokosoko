import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // Japanese-first: `/` shows Japanese; Korean is at `/ko`
  locales: ['ja', 'ko'] as const,
  defaultLocale: 'ja',
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];
