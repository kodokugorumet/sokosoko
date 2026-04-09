'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import type { JSONContent } from '@tiptap/core';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { createQuestion } from './actions';

/**
 * Question create form. Simpler than the admin PostForm because:
 *  - board is fixed to `qa` (no selector)
 *  - no excerpt
 *  - status is set to `published` immediately (no draft workflow for
 *    questions — authors tweak via edit, not via publish button)
 *
 * Bilingual tab switcher works the same way as PostForm: both editor
 * instances stay mounted across tab switches so content isn't lost.
 */

type Lang = 'ja' | 'ko';

export function QuestionForm() {
  const t = useTranslations('Qa.form');
  const [activeLang, setActiveLang] = useState<Lang>('ja');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [titleJa, setTitleJa] = useState('');
  const [titleKo, setTitleKo] = useState('');
  const [bodyJa, setBodyJa] = useState<JSONContent | null>(null);
  const [bodyKo, setBodyKo] = useState<JSONContent | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createQuestion(formData);
      if (res && !res.ok) setError(res.error);
    });
  }

  const errorMessage = error
    ? (() => {
        switch (error) {
          case 'title-required':
            return t('error.titleRequired');
          case 'slug-collision':
            return t('error.slugCollision');
          default:
            return t('error.unknown');
        }
      })()
    : null;

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
            placeholder={t('titlePlaceholderJa')}
            className="hand-box rounded-md bg-[var(--background)] px-4 py-2 text-base focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
            disabled={pending}
            maxLength={120}
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[var(--ink)]">
            {t('bodyLabel')}{' '}
            <span className="text-xs font-normal text-zinc-500">{t('bodyOptional')}</span>
          </span>
          <TipTapEditor
            value={bodyJa}
            onChange={setBodyJa}
            name="body_ja"
            ariaLabel={t('bodyLabel') + ' (JA)'}
          />
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
            placeholder={t('titlePlaceholderKo')}
            className="hand-box rounded-md bg-[var(--background)] px-4 py-2 text-base focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
            disabled={pending}
            maxLength={120}
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[var(--ink)]">
            {t('bodyLabel')}{' '}
            <span className="text-xs font-normal text-zinc-500">{t('bodyOptional')}</span>
          </span>
          <TipTapEditor
            value={bodyKo}
            onChange={setBodyKo}
            name="body_ko"
            ariaLabel={t('bodyLabel') + ' (KO)'}
          />
        </div>
      </div>

      {/* Hidden title mirrors so the inactive language still submits. Body
          mirrors are rendered by TipTapEditor itself. */}
      {activeLang !== 'ja' ? <input type="hidden" name="title_ja" value={titleJa} /> : null}
      {activeLang !== 'ko' ? <input type="hidden" name="title_ko" value={titleKo} /> : null}

      {errorMessage ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={pending || (titleJa.trim().length === 0 && titleKo.trim().length === 0)}
          className="rounded-md border border-[var(--border)] bg-[var(--ink)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? t('submitting') : t('submit')}
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
