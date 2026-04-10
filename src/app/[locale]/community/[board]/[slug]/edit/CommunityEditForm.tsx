'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import type { JSONContent } from '@tiptap/core';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { updateCommunityPost } from '../actions';

type Lang = 'ja' | 'ko';

type Props = {
  postId: string;
  boardSlug: string;
  initialTitleJa: string;
  initialTitleKo: string;
  initialBodyJa: JSONContent | null;
  initialBodyKo: JSONContent | null;
};

export function CommunityEditForm({
  postId,
  boardSlug,
  initialTitleJa,
  initialTitleKo,
  initialBodyJa,
  initialBodyKo,
}: Props) {
  const t = useTranslations('Community.form');
  const tEdit = useTranslations('Community.edit');
  const [activeLang, setActiveLang] = useState<Lang>('ja');
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { kind: 'idle' } | { kind: 'success' } | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  const [titleJa, setTitleJa] = useState(initialTitleJa);
  const [titleKo, setTitleKo] = useState(initialTitleKo);
  const [bodyJa, setBodyJa] = useState<JSONContent | null>(initialBodyJa);
  const [bodyKo, setBodyKo] = useState<JSONContent | null>(initialBodyKo);

  function handleSubmit(formData: FormData) {
    setResult({ kind: 'idle' });
    startTransition(async () => {
      const res = await updateCommunityPost(postId, boardSlug, formData);
      if (res.ok) {
        setResult({ kind: 'success' });
      } else {
        setResult({ kind: 'error', message: res.error });
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      <div role="tablist" aria-label={t('langTabsLabel')} className="flex gap-1">
        <TabButton
          active={activeLang === 'ja'}
          onClick={() => setActiveLang('ja')}
          label="日本語"
        />
        <TabButton
          active={activeLang === 'ko'}
          onClick={() => setActiveLang('ko')}
          label="한국어"
        />
      </div>

      {/* JA */}
      <div className={activeLang === 'ja' ? 'flex flex-col gap-4' : 'hidden'}>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[var(--ink)]">{t('titleLabelJa')}</span>
          <input
            type="text"
            name="title_ja"
            value={titleJa}
            onChange={(e) => setTitleJa(e.target.value)}
            className="hand-box rounded-md bg-[var(--background)] px-4 py-2 text-base focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
            disabled={pending}
            maxLength={120}
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[var(--ink)]">{t('bodyLabel')}</span>
          <TipTapEditor value={bodyJa} onChange={setBodyJa} name="body_ja" ariaLabel="Body (JA)" />
        </div>
      </div>

      {/* KO */}
      <div className={activeLang === 'ko' ? 'flex flex-col gap-4' : 'hidden'}>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[var(--ink)]">{t('titleLabelKo')}</span>
          <input
            type="text"
            name="title_ko"
            value={titleKo}
            onChange={(e) => setTitleKo(e.target.value)}
            className="hand-box rounded-md bg-[var(--background)] px-4 py-2 text-base focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
            disabled={pending}
            maxLength={120}
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[var(--ink)]">{t('bodyLabel')}</span>
          <TipTapEditor value={bodyKo} onChange={setBodyKo} name="body_ko" ariaLabel="Body (KO)" />
        </div>
      </div>

      {activeLang !== 'ja' ? <input type="hidden" name="title_ja" value={titleJa} /> : null}
      {activeLang !== 'ko' ? <input type="hidden" name="title_ko" value={titleKo} /> : null}

      {result.kind === 'success' ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{tEdit('saved')}</p>
      ) : result.kind === 'error' ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {result.message}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={pending || (titleJa.trim().length === 0 && titleKo.trim().length === 0)}
          className="rounded-md border border-[var(--border)] bg-[var(--ink)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? t('submitting') : tEdit('save')}
        </button>
      </div>
    </form>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-md border px-4 py-2 text-sm transition-colors ${
        active
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]'
          : 'border-[var(--border)] bg-[var(--background)] text-zinc-600 hover:border-[var(--accent)] dark:text-zinc-400'
      }`}
    >
      {label}
    </button>
  );
}
