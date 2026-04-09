import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { OnboardingForm } from './OnboardingForm';

/**
 * One-time nickname setup screen, shown right after the first magic-link
 * sign-in. The auth callback bounces here if `profiles.onboarded = false`.
 *
 * Anyone visiting this URL while already onboarded is sent home — no
 * editing of nickname after the fact in Phase 2-B (will live in `/settings`
 * later).
 */

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Auth' });
  return {
    title: t('onboarding.metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function OnboardingPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Without Supabase env vars, sending users here would just 500. Bounce
  // them back to /login which has its own "not configured" panel.
  if (!isSupabaseConfigured()) redirect('/login');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, onboarded')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.onboarded) redirect('/');

  const t = await getTranslations('Auth.onboarding');

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-6 py-16">
      <h1 className="font-hand mb-2 text-4xl tracking-wide text-[var(--ink)]">{t('heading')}</h1>
      <p className="mb-8 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{t('body')}</p>
      <OnboardingForm initialNickname={profile?.nickname ?? ''} />
    </div>
  );
}
