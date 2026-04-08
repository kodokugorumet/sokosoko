import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/layout/PageHeader';

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'About' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

const PHILOSOPHY_KEYS = [0, 1, 2] as const;
const PILLARS = ['life', 'study', 'trip'] as const;
const MEMBERS = ['lead', 'dev'] as const;

export default async function AboutPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('About');

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-16">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {/* Intro */}
      <section className="mb-16">
        <h2 className="mb-4 text-xl font-medium tracking-tight sm:text-2xl">
          {t('intro.heading')}
        </h2>
        <p className="leading-relaxed text-zinc-700 dark:text-zinc-300">{t('intro.body')}</p>
      </section>

      {/* Philosophy */}
      <section className="mb-16">
        <h2 className="mb-6 text-xl font-medium tracking-tight sm:text-2xl">
          {t('philosophy.heading')}
        </h2>
        <ul className="flex flex-col gap-6">
          {PHILOSOPHY_KEYS.map((i) => (
            <li key={i} className="hand-box rounded-md p-5">
              <h3 className="mb-2 text-base font-medium text-[var(--accent)]">
                {t(`philosophy.items.${i}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {t(`philosophy.items.${i}.body`)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Three pillars */}
      <section className="mb-16">
        <h2 className="mb-6 text-xl font-medium tracking-tight sm:text-2xl">
          {t('pillars.heading')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p} className="hand-box rounded-md p-5">
              <h3 className="font-hand mb-2 text-lg tracking-wide">{t(`pillars.${p}.title`)}</h3>
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {t(`pillars.${p}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="mb-16">
        <h2 className="mb-2 text-xl font-medium tracking-tight sm:text-2xl">{t('team.heading')}</h2>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">{t('team.note')}</p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {MEMBERS.map((m) => (
            <li key={m} className="hand-box flex flex-col rounded-md p-5">
              <div
                aria-hidden="true"
                className="mb-4 h-20 w-20 rounded-full bg-[var(--accent-soft)]"
              />
              <p className="text-base font-medium">{t(`team.members.${m}.name`)}</p>
              <p className="mb-2 text-xs text-[var(--accent)]">{t(`team.members.${m}.role`)}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {t(`team.members.${m}.bio`)}
              </p>
            </li>
          ))}
          <li className="flex items-center justify-center rounded-md border border-dashed border-zinc-300 p-5 text-sm text-zinc-400 dark:border-zinc-700">
            + {t('team.comingSoon')}
          </li>
        </ul>
      </section>

      {/* CTA */}
      <section className="hand-box rounded-md p-6 text-center">
        <h2 className="mb-3 text-lg font-medium tracking-tight">{t('cta.heading')}</h2>
        <p className="mb-5 text-sm text-zinc-700 dark:text-zinc-300">{t('cta.body')}</p>
        <Link
          href="/contact"
          className="inline-block rounded-md border border-[var(--border)] px-5 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent-soft)]"
        >
          {t('cta.contactLabel')}
        </Link>
      </section>
    </div>
  );
}
