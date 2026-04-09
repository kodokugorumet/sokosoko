'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import type { JSONContent } from '@tiptap/core';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { createAnswer } from '../actions';

/**
 * Inline answer composer. Bilingual tabs like the question form but
 * even slimmer — no title, only a body per language. On success clears
 * both editors so the user can answer again (rare but the revalidate
 * path pulls the new answer into the list above).
 */

type Lang = 'ja' | 'ko';

export function AnswerForm({ questionId }: { questionId: string }) {
  const t = useTranslations('Qa.detail.answerForm');
  const [activeLang, setActiveLang] = useState<Lang>('ja');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [bodyJa, setBodyJa] = useState<JSONContent | null>(null);
  const [bodyKo, setBodyKo] = useState<JSONContent | null>(null);
  // Forces both TipTap editors to remount after a successful submit so
  // their internal state clears without us having to track it by hand.
  const [formKey, setFormKey] = useState(0);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createAnswer(questionId, formData);
      if (res.ok) {
        setBodyJa(null);
        setBodyKo(null);
        setFormKey((k) => k + 1);
      } else {
        setError(res.error);
      }
    });
  }

  const errorMessage = error
    ? error === 'body-required'
      ? t('error.bodyRequired')
      : t('error.unknown')
    : null;

  const bodyEmpty = !bodyJa && !bodyKo;

  return (
    <div className="hand-box rounded-md bg-[var(--background)] p-5">
      <h3 className="font-hand mb-4 text-lg tracking-wide text-[var(--ink)]">{t('heading')}</h3>
      <form action={handleSubmit} className="flex flex-col gap-4">
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

        <div className={activeLang === 'ja' ? 'flex flex-col gap-2' : 'hidden'}>
          <TipTapEditor
            key={`ja-${formKey}`}
            value={bodyJa}
            onChange={setBodyJa}
            name="body_ja"
            ariaLabel={t('bodyLabel') + ' (JA)'}
          />
        </div>
        <div className={activeLang === 'ko' ? 'flex flex-col gap-2' : 'hidden'}>
          <TipTapEditor
            key={`ko-${formKey}`}
            value={bodyKo}
            onChange={setBodyKo}
            name="body_ko"
            ariaLabel={t('bodyLabel') + ' (KO)'}
          />
        </div>

        {errorMessage ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={pending || bodyEmpty}
            className="rounded-md border border-[var(--border)] bg-[var(--ink)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? t('submitting') : t('submit')}
          </button>
        </div>
      </form>
    </div>
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
      className={`rounded-md border px-3 py-1 text-xs transition-colors ${
        active
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]'
          : 'border-[var(--border)] bg-[var(--background)] text-zinc-600 hover:border-[var(--accent)] dark:text-zinc-400'
      }`}
    >
      {label}
    </button>
  );
}
