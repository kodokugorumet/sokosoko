import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { LoginForm } from './LoginForm';

/**
 * Email magic-link login page. If the user is already signed in we just
 * bounce them home — no point showing the form.
 *
 * The form itself is a Client Component (LoginForm.tsx) because it owns
 * the input state and the "check your email" success message; the actual
 * `signInWithOtp` call runs in a Server Action so the redirect URL is
 * computed server-side.
 */

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Auth' });
  return {
    title: t('login.metaTitle'),
    description: t('login.metaDescription'),
    robots: { index: false, follow: true },
  };
}

export default async function LoginPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Auth');

  // Local dev / CI without env vars: render an explicit "not configured"
  // panel instead of crashing. Production deploys always have the vars.
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col px-6 py-16">
        <h1 className="font-hand mb-2 text-4xl tracking-wide text-[var(--ink)]">
          {t('login.heading')}
        </h1>
        <div className="hand-box rounded-md bg-[var(--accent-soft)] p-6 text-sm leading-relaxed">
          {t('notConfigured')}
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/');

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-6 py-16">
      <h1 className="font-hand mb-2 text-4xl tracking-wide text-[var(--ink)]">
        {t('login.heading')}
      </h1>
      <p className="mb-8 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {t('login.subtitle')}
      </p>
      <LoginForm />
    </div>
  );
}
