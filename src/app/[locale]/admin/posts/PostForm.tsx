'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import type { JSONContent } from '@tiptap/core';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import type { BoardRow, AdminPostRow } from '@/lib/posts/queries';
import { createPost, updatePost } from './actions';

/**
 * Post create / edit form. Single component with a `mode` prop so the
 * create and edit pages share validation, layout, and the bilingual
 * tab switcher without duplication.
 *
 * Bilingual tabs: the user picks JA or KO at a time but state for both
 * languages is held in React, so switching tabs doesn't wipe the other
 * side. On submit we serialise both bodies to JSON and send them via
 * hidden inputs that the server action parses.
 */

type Props =
  | {
      mode: 'create';
      boards: BoardRow[];
      initial?: never;
    }
  | {
      mode: 'edit';
      boards?: never;
      initial: AdminPostRow;
    };

type Lang = 'ja' | 'ko';

export function PostForm(props: Props) {
  const t = useTranslations('Admin.posts.form');
  const [activeLang, setActiveLang] = useState<Lang>('ja');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Initial values for edit mode; empty for create mode.
  const seed = props.mode === 'edit' ? props.initial : undefined;

  const [boardSlug, setBoardSlug] = useState<string>(
    seed?.board_slug ?? props.boards?.[0]?.slug ?? '',
  );
  const [titleJa, setTitleJa] = useState(seed?.title_ja ?? '');
  const [titleKo, setTitleKo] = useState(seed?.title_ko ?? '');
  const [excerptJa, setExcerptJa] = useState(seed?.excerpt_ja ?? '');
  const [excerptKo, setExcerptKo] = useState(seed?.excerpt_ko ?? '');
  const [bodyJa, setBodyJa] = useState<JSONContent | null>(seed?.body_ja ?? null);
  const [bodyKo, setBodyKo] = useState<JSONContent | null>(seed?.body_ko ?? null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      if (props.mode === 'create') {
        const res = await createPost(formData);
        // createPost() either redirects on success or returns an error.
        // Reaching here means it returned an error.
        if (res && !res.ok) setError(res.error);
      } else {
        const res = await updatePost(props.initial.id, formData);
        if (!res.ok) setError(res.error);
        else setError(null);
      }
    });
  }

  const errorMessage = error
    ? (() => {
        switch (error) {
          case 'board-required':
            return t('error.boardRequired');
          case 'title-required':
            return t('error.titleRequired');
          case 'body-required':
            return t('error.bodyRequired');
          case 'slug-collision':
            return t('error.slugCollision');
          default:
            return t('error.unknown');
        }
      })()
    : null;

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      {/* Board selector — only shown in create mode; edit mode locks the
          board because moving a post across boards would break its slug
          uniqueness guarantees. */}
      {props.mode === 'create' ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[var(--ink)]">{t('boardLabel')}</span>
          <select
            name="board_slug"
            value={boardSlug}
            onChange={(e) => setBoardSlug(e.target.value)}
            className="hand-box rounded-md bg-[var(--background)] px-4 py-2 text-base focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
            disabled={pending}
          >
            {props.boards.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name_ja} / {b.name_ko}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="board_slug" value={boardSlug} />
      )}

      {/* Language tabs — the active tab's inputs are visible; the other
          language's state lives in hidden fields so the server action
          receives both sides on submit. */}
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

      {/* JA tab — shown when activeLang === 'ja', otherwise hidden visually
          but still mounted so its TipTap editor keeps its state. */}
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
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[var(--ink)]">{t('excerptLabel')}</span>
          <textarea
            name="excerpt_ja"
            value={excerptJa}
            onChange={(e) => setExcerptJa(e.target.value)}
            rows={2}
            placeholder={t('excerptPlaceholder')}
            className="hand-box rounded-md bg-[var(--background)] px-4 py-2 text-sm focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
            disabled={pending}
            maxLength={200}
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[var(--ink)]">{t('bodyLabel')}</span>
          <TipTapEditor
            value={bodyJa}
            onChange={setBodyJa}
            name="body_ja"
            ariaLabel={t('bodyLabel') + ' (JA)'}
          />
        </div>
      </div>

      {/* KO tab */}
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
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[var(--ink)]">{t('excerptLabel')}</span>
          <textarea
            name="excerpt_ko"
            value={excerptKo}
            onChange={(e) => setExcerptKo(e.target.value)}
            rows={2}
            placeholder={t('excerptPlaceholder')}
            className="hand-box rounded-md bg-[var(--background)] px-4 py-2 text-sm focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
            disabled={pending}
            maxLength={200}
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[var(--ink)]">{t('bodyLabel')}</span>
          <TipTapEditor
            value={bodyKo}
            onChange={setBodyKo}
            name="body_ko"
            ariaLabel={t('bodyLabel') + ' (KO)'}
          />
        </div>
      </div>

      {/* Hidden mirrors so the inactive language's title/excerpt still
          post along with the form. (Body hidden inputs are rendered by
          the TipTapEditor itself.) */}
      {activeLang !== 'ja' ? (
        <>
          <input type="hidden" name="title_ja" value={titleJa} />
          <input type="hidden" name="excerpt_ja" value={excerptJa} />
        </>
      ) : null}
      {activeLang !== 'ko' ? (
        <>
          <input type="hidden" name="title_ko" value={titleKo} />
          <input type="hidden" name="excerpt_ko" value={excerptKo} />
        </>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-[var(--border)] bg-[var(--ink)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? t('submitting')
            : props.mode === 'create'
              ? t('createSubmit')
              : t('saveSubmit')}
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
