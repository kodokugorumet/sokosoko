import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

const PILLARS = [
  { key: 'life', href: '/life', emoji: '🏠', tone: 'from-amber-100 to-orange-200' },
  { key: 'study', href: '/study', emoji: '📖', tone: 'from-emerald-100 to-teal-200' },
  { key: 'trip', href: '/trip', emoji: '🧭', tone: 'from-sky-100 to-indigo-200' },
] as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Home');
  const tBrand = await getTranslations('Brand');

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
      {/* Hero */}
      <section className="mb-20 text-center sm:text-left">
        <p className="mb-4 text-sm font-medium tracking-widest text-[var(--accent)] uppercase">
          {tBrand('name')}
        </p>
        <h1 className="text-4xl leading-tight font-bold tracking-tight sm:text-6xl">
          {t('hero.title')}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-300">{t('hero.lead')}</p>
      </section>

      {/* 3-Pillar Cards */}
      <section className="mb-24">
        <h2 className="mb-8 text-2xl font-semibold">{t('pillars.title')}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <Link
              key={p.key}
              href={p.href}
              className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${p.tone} p-8 transition-transform hover:-translate-y-1 hover:shadow-xl`}
            >
              <div className="text-5xl">{p.emoji}</div>
              <h3 className="mt-6 text-2xl font-bold text-zinc-900">
                {t(`pillars.${p.key}.title`)}
              </h3>
              <p className="mt-2 text-zinc-700">{t(`pillars.${p.key}.desc`)}</p>
              <span className="absolute right-6 bottom-6 text-2xl text-zinc-900 transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* New section (placeholder until Sanity wired up) */}
      <section>
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold">{t('newSection.title')}</h2>
        </div>
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-[var(--muted)] p-12 text-center text-zinc-500 dark:border-zinc-700">
          {t('comingSoon')}
        </div>
      </section>
    </div>
  );
}
