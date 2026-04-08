import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

// 3-pillar entry cards. `hasNew` flips to true when a fresh post arrives in
// that pillar (Phase A — wire to Sanity `posts` query: published within last
// N days). Currently `false` for all three since the blog hasn't launched.
const PILLARS = [
  { key: 'life', href: '/life', hasNew: false },
  { key: 'study', href: '/study', hasNew: false },
  { key: 'trip', href: '/trip', hasNew: false },
] as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Home');
  const tBrand = await getTranslations('Brand');

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:py-16">
      {/* Hero — wireframe-faithful: handwritten wordmark + mascot illustration */}
      <section className="mb-16 flex flex-col items-center sm:mb-24">
        <h1 className="font-hand mb-6 text-5xl tracking-wide text-[var(--ink)] sm:text-7xl">
          {tBrand('short')}
        </h1>
        <div className="relative h-80 w-80 sm:h-[28rem] sm:w-[28rem]">
          <Image
            src="/brand/logo.png"
            alt={tBrand('name')}
            fill
            priority
            sizes="(min-width: 640px) 448px, 320px"
            className="object-contain"
          />
        </div>
      </section>

      {/* 3-pillar category entry boxes. A "New!" sticker appears on cards
          whose category has a recently published post. */}
      <section className="mb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <Link
              key={p.key}
              href={p.href}
              className="hand-box group relative flex h-56 flex-col rounded-md p-5 transition-colors hover:bg-[var(--accent-soft)]"
            >
              {p.hasNew ? (
                <span
                  aria-label={t('newLabel')}
                  className="font-hand absolute -top-3 -right-3 rotate-6 rounded-full bg-[var(--accent)] px-3 py-1 text-sm text-white shadow-md"
                >
                  {t('newLabel')}
                </span>
              ) : null}
              <h2 className="border-b border-[var(--border)] pb-2 text-base font-medium tracking-tight">
                {t(`pillars.${p.key}`)}
              </h2>
              {/* Empty body — will be replaced with latest posts per pillar in Phase A */}
              <div className="flex-1" />
              <span className="self-end text-xs text-zinc-400 transition-colors group-hover:text-[var(--accent)]">
                {t('comingSoon')} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Community CTA — balances the "just an info site" feel */}
      <section className="mb-8">
        <div className="hand-box rounded-md bg-[var(--accent-soft)] p-8 text-center sm:p-10">
          <h2 className="font-hand mb-3 text-2xl tracking-wide text-[var(--ink)] sm:text-3xl">
            {t('cta.heading')}
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-sm leading-relaxed text-zinc-700 sm:text-base dark:text-zinc-300">
            {t('cta.body')}
          </p>
          <Link
            href="/about"
            className="inline-block rounded-md border border-[var(--border)] bg-[var(--background)] px-6 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent)] hover:text-white"
          >
            {t('cta.button')}
          </Link>
        </div>
      </section>
    </div>
  );
}
