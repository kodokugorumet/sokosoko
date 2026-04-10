import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { requireRole } from '@/lib/auth/require-role';
import { BroadcastForm } from './BroadcastForm';

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Broadcast' });
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

/**
 * Standalone broadcast page. Operators can compose a message and send
 * it to one or more SNS platforms without creating a post. Useful for
 * event announcements, quick shares, or messages that don't warrant a
 * full article.
 */
export default async function BroadcastPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireRole('operator');
  const t = await getTranslations('Broadcast');

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10 sm:py-16">
      <h1 className="font-hand mb-2 text-3xl tracking-wide text-[var(--ink)] sm:text-4xl">
        {t('heading')}
      </h1>
      <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">{t('subtitle')}</p>
      <BroadcastForm />
    </div>
  );
}
