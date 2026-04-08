import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/layout/PageHeader';

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Qa' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

// Phase 1 placeholder. The actual Q&A entries will be authored in Sanity
// (`qa` document type) and rendered here in Phase C.
const CATEGORY_KEYS = [0, 1, 2, 3] as const;

export default async function QaPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Qa');

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-16">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <p className="mb-10 leading-relaxed text-zinc-700 dark:text-zinc-300">{t('intro')}</p>

      {/* Coming-soon CTA — directs early visitors to Contact while the Q&A is empty */}
      <section className="hand-box mb-12 rounded-md bg-[var(--accent-soft)] p-6 text-center sm:p-8">
        <h2 className="font-hand mb-3 text-xl tracking-wide text-[var(--ink)] sm:text-2xl">
          {t('comingSoon.heading')}
        </h2>
        <p className="mx-auto mb-5 max-w-xl text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {t('comingSoon.body')}
        </p>
        <Link
          href="/contact"
          className="inline-block rounded-md border border-[var(--border)] bg-[var(--background)] px-5 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent)] hover:text-white"
        >
          {t('comingSoon.contactLabel')}
        </Link>
      </section>

      {/* Planned topics — gives visitors a sense of scope before content lands */}
      <section>
        <h2 className="font-hand mb-5 text-lg tracking-wide text-[var(--ink)] sm:text-xl">
          {t('categories.heading')}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {CATEGORY_KEYS.map((i) => (
            <li key={i} className="hand-box rounded-md p-5">
              <h3 className="mb-2 text-base font-medium">{t(`categories.items.${i}.title`)}</h3>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {t(`categories.items.${i}.body`)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
