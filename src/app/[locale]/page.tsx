import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { sanityFetch } from '../../../sanity/lib/fetch';
import {
  LATEST_POSTS_HOME_QUERY,
  type LatestPostsByPillar,
  type PostCard,
  type Pillar,
} from '../../../sanity/lib/queries';

// Posts published within this window (in days) earn the "New!" sticker on
// the pillar card. Tuned to the expected posting cadence; bump it if the
// blog goes quiet so the badges don't all disappear.
const NEW_WINDOW_DAYS = 14;

const PILLARS: ReadonlyArray<{ key: Pillar; href: `/${Pillar}` }> = [
  { key: 'life', href: '/life' },
  { key: 'study', href: '/study' },
  { key: 'trip', href: '/trip' },
];

function pickLocaleString(value: { ja?: string; ko?: string } | undefined, locale: string): string {
  if (!value) return '';
  if (locale === 'ko') return value.ko ?? value.ja ?? '';
  return value.ja ?? value.ko ?? '';
}

function isWithinNewWindow(isoDate: string | undefined): boolean {
  if (!isoDate) return false;
  const published = new Date(isoDate).getTime();
  if (Number.isNaN(published)) return false;
  const ageMs = Date.now() - published;
  return ageMs >= 0 && ageMs <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Home');
  const tBrand = await getTranslations('Brand');

  // One grouped query for all three pillars; cached via the shared `post`
  // tag so the webhook handler can invalidate the home alongside the rest
  // of the site when Studio publishes a new post.
  const latest = await sanityFetch<LatestPostsByPillar>({
    query: LATEST_POSTS_HOME_QUERY,
    tags: ['post', 'home'],
    fallback: { life: [], study: [], trip: [] },
  });

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

      {/* 3-pillar category entry boxes. Each card lists the two newest
          posts in that pillar; the "New!" sticker appears when the newest
          post is within NEW_WINDOW_DAYS. */}
      <section className="mb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => {
            const posts: PostCard[] = latest[p.key] ?? [];
            const hasNew = isWithinNewWindow(posts[0]?.publishedAt);
            return (
              <Link
                key={p.key}
                href={p.href}
                className="hand-box group relative flex h-56 flex-col rounded-md p-5 transition-colors hover:bg-[var(--accent-soft)]"
              >
                {hasNew ? (
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
                <ul className="mt-3 flex flex-1 flex-col gap-2 overflow-hidden text-sm text-zinc-700 dark:text-zinc-300">
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <li key={post._id} className="line-clamp-2 leading-snug">
                        · {pickLocaleString(post.title, locale)}
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-zinc-400">{t('noPostsYet')}</li>
                  )}
                </ul>
                <span className="mt-2 self-end text-xs text-zinc-400 transition-colors group-hover:text-[var(--accent)]">
                  {posts.length > 0 ? t('viewAll') : `${t('comingSoon')} →`}
                </span>
              </Link>
            );
          })}
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
