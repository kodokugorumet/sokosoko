'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { broadcastMessage, type BroadcastResult } from './actions';

const MAX_CHARS = 280;

/**
 * Broadcast form: textarea (up to 280 chars for X compatibility) +
 * platform checkboxes + send button. Shows results inline after each
 * send so the operator can see which platforms succeeded and which
 * failed without leaving the page.
 */
export function BroadcastForm() {
  const t = useTranslations('Broadcast.form');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const [results, setResults] = useState<BroadcastResult[] | null>(null);

  function handleSubmit(formData: FormData) {
    setResults(null);
    startTransition(async () => {
      const res = await broadcastMessage(formData);
      setResults(res);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      {/* Message */}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[var(--ink)]">{t('messageLabel')}</span>
        <textarea
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={MAX_CHARS}
          placeholder={t('messagePlaceholder')}
          className="hand-box rounded-md bg-[var(--background)] px-4 py-3 text-sm leading-relaxed focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
          disabled={pending}
        />
        <span className="text-xs text-zinc-500">
          {message.length}/{MAX_CHARS}
        </span>
      </label>

      {/* Platform checkboxes */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-[var(--ink)]">
          {t('platformsLabel')}
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="platform_x"
            defaultChecked
            disabled={pending}
            className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span>X (Twitter)</span>
        </label>
        {/* Future platforms:
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="platform_line" disabled={pending} />
          <span>LINE</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="platform_instagram" disabled={pending} />
          <span>Instagram</span>
        </label>
        */}
      </fieldset>

      {/* Send button */}
      <div>
        <button
          type="submit"
          disabled={pending || message.trim().length === 0}
          className="rounded-md border border-[var(--border)] bg-[var(--ink)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? t('sending') : t('send')}
        </button>
      </div>

      {/* Results */}
      {results ? (
        <div className="flex flex-col gap-2">
          {results.map((r, i) => (
            <div
              key={i}
              className={`hand-box rounded-md p-3 text-sm ${
                r.ok
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                  : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'
              }`}
            >
              <span className="font-medium">{r.platform.toUpperCase()}</span>
              {' — '}
              {r.detail}
            </div>
          ))}
        </div>
      ) : null}
    </form>
  );
}
