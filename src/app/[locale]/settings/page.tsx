import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/require-role';
import { SettingsForm } from './SettingsForm';

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Settings' });
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function SettingsPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) redirect('/login');

  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!user.onboarded) redirect('/onboarding');

  // Fetch the full profile row (including bio fields)
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, bio_ja, bio_ko, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const t = await getTranslations('Settings');

  return (
    <div className="mx-auto w-full max-w-lg px-6 py-10 sm:py-16">
      <h1 className="font-hand mb-2 text-3xl tracking-wide text-[var(--ink)] sm:text-4xl">
        {t('heading')}
      </h1>
      <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">{t('subtitle')}</p>
      <SettingsForm
        initialNickname={profile?.nickname ?? user.nickname}
        initialBioJa={profile?.bio_ja ?? ''}
        initialBioKo={profile?.bio_ko ?? ''}
      />
    </div>
  );
}
