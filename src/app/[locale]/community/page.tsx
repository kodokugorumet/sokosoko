import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { listCommunityBoards, type BoardRow } from '@/lib/posts/queries';
import { isSupabaseConfigured } from '@/lib/supabase/server';

type Params = { locale: string };
type Locale = 'ja' | 'ko';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Community' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

/**
 * Community index page. Lists every member-writable board as a card
 * linking to `/community/[board]`. When there's only one board (like
 * the initial `free` board) this page is a thin pass-through, but it
 * scales cleanly as the operator adds more boards via SQL inserts.
 */
export default async function CommunityIndexPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Community');
  const loc = locale as Locale;

  const boards = isSupabaseConfigured()
    ? await listCommunityBoards().catch(() => [] as BoardRow[])
    : [];

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:py-16">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {boards.length === 0 ? (
        <div className="hand-box rounded-md bg-[var(--accent-soft)] p-10 text-center">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{t('empty')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {boards.map((board) => {
            const name = loc === 'ja' ? board.name_ja : board.name_ko;
            const desc =
              loc === 'ja'
                ? (board.description_ja ?? board.description_ko ?? '')
                : (board.description_ko ?? board.description_ja ?? '');
            return (
              <Link
                key={board.slug}
                href={`/community/${board.slug}`}
                className="hand-box flex flex-col gap-2 rounded-md p-5 transition-colors hover:bg-[var(--accent-soft)]"
              >
                <h2 className="text-lg font-medium tracking-tight text-[var(--ink)]">{name}</h2>
                {desc ? (
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{desc}</p>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
