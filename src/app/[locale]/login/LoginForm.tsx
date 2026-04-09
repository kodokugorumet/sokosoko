'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { sendMagicLink } from './actions';

/**
 * Magic link request form. Owns three pieces of state:
 *  - the email input value (controlled),
 *  - whether the action is in flight (`useTransition`'s pending),
 *  - the most recent action result (success / error message).
 *
 * Intentionally does NOT redirect on success — the user has to leave the
 * tab to check their email anyway, so the explicit "check your inbox"
 * panel is the better UX than a spinner-then-flash.
 */
export function LoginForm() {
  const t = useTranslations('Auth.login');
  const [email, setEmail] = useState('');
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { kind: 'idle' } | { kind: 'sent' } | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await sendMagicLink(formData);
      if (res.ok) {
        setResult({ kind: 'sent' });
      } else {
        setResult({ kind: 'error', message: res.error });
      }
    });
  }

  if (result.kind === 'sent') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="hand-box rounded-md bg-[var(--accent-soft)] p-6 text-center"
      >
        <p className="font-hand mb-2 text-2xl tracking-wide text-[var(--ink)]">
          {t('sent.heading')}
        </p>
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {t('sent.body', { email })}
        </p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[var(--ink)]">{t('emailLabel')}</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="hand-box w-full rounded-md bg-[var(--background)] px-4 py-3 text-base focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
          disabled={pending}
        />
      </label>

      {result.kind === 'error' ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {result.message === 'empty'
            ? t('error.empty')
            : result.message === 'invalid'
              ? t('error.invalid')
              : t('error.unknown')}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-[var(--border)] bg-[var(--ink)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
