'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { updateProfile } from './actions';

type Props = {
  initialNickname: string;
  initialBioJa: string;
  initialBioKo: string;
};

export function SettingsForm({ initialNickname, initialBioJa, initialBioKo }: Props) {
  const t = useTranslations('Settings.form');
  const [nickname, setNickname] = useState(initialNickname);
  const [bioJa, setBioJa] = useState(initialBioJa);
  const [bioKo, setBioKo] = useState(initialBioKo);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { kind: 'idle' } | { kind: 'success' } | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  function handleSubmit(formData: FormData) {
    setResult({ kind: 'idle' });
    startTransition(async () => {
      const res = await updateProfile(formData);
      if (res.ok) {
        setResult({ kind: 'success' });
      } else {
        const msg = (() => {
          switch (res.error) {
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
            default:
              return t('error.unknown');
          }
        })();
        setResult({ kind: 'error', message: msg });
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      {/* Nickname */}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[var(--ink)]">{t('nicknameLabel')}</span>
        <input
          type="text"
          name="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          minLength={2}
          maxLength={24}
          required
          className="hand-box rounded-md bg-[var(--background)] px-4 py-3 text-base focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
          disabled={pending}
        />
        <span className="text-xs text-zinc-500">{t('nicknameHint')}</span>
      </label>

      {/* Bio (JA) */}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[var(--ink)]">{t('bioJaLabel')}</span>
        <textarea
          name="bio_ja"
          value={bioJa}
          onChange={(e) => setBioJa(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder={t('bioPlaceholder')}
          className="hand-box rounded-md bg-[var(--background)] px-4 py-2 text-sm focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
          disabled={pending}
        />
        <span className="text-xs text-zinc-500">{bioJa.length}/300</span>
      </label>

      {/* Bio (KO) */}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[var(--ink)]">{t('bioKoLabel')}</span>
        <textarea
          name="bio_ko"
          value={bioKo}
          onChange={(e) => setBioKo(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder={t('bioPlaceholder')}
          className="hand-box rounded-md bg-[var(--background)] px-4 py-2 text-sm focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
          disabled={pending}
        />
        <span className="text-xs text-zinc-500">{bioKo.length}/300</span>
      </label>

      {result.kind === 'success' ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{t('saved')}</p>
      ) : result.kind === 'error' ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {result.message}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={pending || nickname.trim().length < 2}
          className="rounded-md border border-[var(--border)] bg-[var(--ink)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? t('saving') : t('save')}
        </button>
      </div>
    </form>
  );
}
