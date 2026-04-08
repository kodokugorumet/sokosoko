import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { PageHeader } from '@/components/layout/PageHeader';
import { PostCard } from '@/components/post/PostCard';
import { sanityFetch } from '../../../../sanity/lib/fetch';
import {
  POSTS_BY_PILLAR_QUERY,
  type PostCard as PostCardType,
  type Pillar,
} from '../../../../sanity/lib/queries';

export const revalidate = 3600;

const PILLARS = ['life', 'study', 'trip'] as const;
type PillarSlug = (typeof PILLARS)[number];

function isPillar(value: string): value is PillarSlug {
  return (PILLARS as readonly string[]).includes(value);
}

type Params = { locale: string; pillar: string };

export function generateStaticParams() {
  // 2 locales × 3 pillars = 6 routes
  return routing.locales.flatMap((locale) => PILLARS.map((pillar) => ({ locale, pillar })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, pillar } = await params;
  if (!isPillar(pillar)) return {};
  const t = await getTranslations({ locale, namespace: 'Pillar' });
  return {
    title: t(`${pillar}.title`),
    description: t(`${pillar}.description`),
  };
}

export default async function PillarPage({ params }: { params: Promise<Params> }) {
  const { locale, pillar } = await params;
  if (!isPillar(pillar)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations('Pillar');

  const posts = await sanityFetch<PostCardType[]>({
    query: POSTS_BY_PILLAR_QUERY,
    params: { pillar: pillar satisfies Pillar },
    tags: ['post', `pillar:${pillar}`],
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:py-16">
      <PageHeader title={t(`${pillar}.title`)} subtitle={t(`${pillar}.subtitle`)} />

      <p className="mb-10 max-w-2xl leading-relaxed text-zinc-700 dark:text-zinc-300">
        {t(`${pillar}.description`)}
      </p>

      {posts.length === 0 ? (
        <div className="hand-box rounded-md bg-[var(--accent-soft)] p-10 text-center">
          <h2 className="font-hand mb-3 text-2xl tracking-wide text-[var(--ink)]">
            {t('empty.heading')}
          </h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{t('empty.body')}</p>
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post._id}>
              <PostCard post={post} locale={locale as 'ja' | 'ko'} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
