import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

const PILLARS = [
  { key: 'life', href: '/life' },
  { key: 'study', href: '/study' },
  { key: 'trip', href: '/trip' },
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

      {/* 3-pillar category entry boxes (latest-post previews will fill in Phase C) */}
      <section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <Link
              key={p.key}
              href={p.href}
              className="hand-box group flex h-56 flex-col rounded-md p-5 transition-colors hover:bg-[var(--accent-soft)]"
            >
              <h2 className="border-b border-[var(--border)] pb-2 text-base font-medium tracking-tight">
                {t(`pillars.${p.key}`)}
              </h2>
              {/* Empty body — will be replaced with latest posts in Phase C */}
              <div className="flex-1" />
              <span className="self-end text-xs text-zinc-400 transition-colors group-hover:text-[var(--accent)]">
                {t('comingSoon')} →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
