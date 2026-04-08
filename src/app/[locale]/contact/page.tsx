import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/layout/PageHeader';

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Contact' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

/**
 * Contact channels. All links are placeholders for Phase 1 — real URLs will be
 * wired in as each account is opened. `href: null` renders the channel as
 * non-clickable ("준비 중" state) without breaking accessibility.
 */
const CHANNELS = [
  { key: 'email', icon: '📧', href: 'mailto:hello@example.com' },
  { key: 'instagram', icon: '📷', href: null },
  { key: 'x', icon: '🐦', href: null },
  { key: 'line', icon: '💬', href: null },
  { key: 'note', icon: '✏️', href: null },
  { key: 'naverCafe', icon: '📘', href: null },
] as const;

export default async function ContactPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Contact');

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-16">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <p className="mb-10 leading-relaxed text-zinc-700 dark:text-zinc-300">{t('intro')}</p>

      <ul className="mb-10 grid gap-4 sm:grid-cols-2">
        {CHANNELS.map((c) => {
          const label = t(`channels.${c.key}.label`);
          const value = t(`channels.${c.key}.value`);
          const description = t(`channels.${c.key}.description`);

          const content = (
            <>
              <div className="mb-2 flex items-center gap-3">
                <span className="text-xl" aria-hidden="true">
                  {c.icon}
                </span>
                <span className="text-base font-medium">{label}</span>
              </div>
              <p className="font-hand text-lg tracking-wide text-[var(--accent)]">{value}</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
            </>
          );

          return (
            <li key={c.key} className="hand-box rounded-md p-5">
              {c.href ? (
                <a href={c.href} className="block hover:opacity-80">
                  {content}
                </a>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>

      <div className="hand-box rounded-md p-5 text-sm text-zinc-600 dark:text-zinc-400">
        {t('responseNote')}
      </div>

      <p className="mt-6 text-center text-xs text-zinc-400">{t('placeholder')}</p>
    </div>
  );
}
