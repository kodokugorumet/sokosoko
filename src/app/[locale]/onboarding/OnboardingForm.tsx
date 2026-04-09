'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { saveNickname } from './actions';

export function OnboardingForm({ initialNickname }: { initialNickname: string }) {
  const t = useTranslations('Auth.onboarding');
  // Strip the auto-generated `user_xxxxxxxx` placeholder so the input
  // shows blank instead of garbage; otherwise prefill what the user had.
  const seed = initialNickname.startsWith('user_') ? '' : initialNickname;
  const [nickname, setNickname] = useState(seed);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await saveNickname(formData);
      // saveNickname() either redirects (success) or returns an error.
      // Reaching this point means it returned an error.
      if (res && !res.ok) setError(res.error);
    });
  }

  const errorMessage = error
    ? (() => {
        switch (error) {
          case 'empty':
          case 'too-short':
            return t('error.tooShort');
          case 'too-long':
            return t('error.tooLong');
          case 'invalid-chars':
            return t('error.invalidChars');
          case 'reserved':
            return t('error.reserved');
          case 'taken':
            return t('error.taken');
          case 'unauthorized':
            return t('error.unauthorized');
          default:
            return t('error.unknown');
        }
      })()
    : null;

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[var(--ink)]">{t('nicknameLabel')}</span>
        <input
          type="text"
          name="nickname"
          required
          minLength={2}
          maxLength={24}
          autoComplete="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t('nicknamePlaceholder')}
          className="hand-box w-full rounded-md bg-[var(--background)] px-4 py-3 text-base focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
          disabled={pending}
        />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{t('nicknameHint')}</span>
      </label>

      {errorMessage ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || nickname.trim().length < 2}
        className="rounded-md border border-[var(--border)] bg-[var(--ink)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
