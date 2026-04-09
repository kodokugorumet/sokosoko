import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/require-role';
import { QuestionForm } from '../QuestionForm';

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Qa' });
  return {
    title: t('new.metaTitle'),
    robots: { index: false, follow: true },
  };
}

/**
 * Ask a new question. Open to any onboarded member — no role gate beyond
 * basic auth, because Q&A is explicitly the place where the `verified`
 * tier is supposed to be earned in the first place.
 */
export default async function NewQuestionPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!user.onboarded) redirect('/onboarding');

  const t = await getTranslations('Qa.new');

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-16">
      <h1 className="font-hand mb-2 text-3xl tracking-wide text-[var(--ink)] sm:text-4xl">
        {t('heading')}
      </h1>
      <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        {t('subtitle', { nickname: user.nickname })}
      </p>
      <QuestionForm />
    </div>
  );
}
