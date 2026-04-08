'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Social share row shown at the bottom of an article.
 *
 * Uses plain intent URLs (X and LINE) instead of heavyweight SDKs so we
 * don't ship extra JS. The "copy link" button is the only bit that needs
 * client state, hence this whole component is `'use client'` — the parent
 * article page stays a Server Component.
 */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const t = useTranslations('Article');
  const [copied, setCopied] = useState(false);

  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const lineHref = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      // Revert the label after a beat so repeat clicks give feedback again.
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API can fail on insecure contexts — silently ignore;
      // the intent links still work.
    }
  }

  const baseBtn =
    'inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--ink)] dark:text-zinc-300';

  return (
    <section className="mt-12 border-t border-[var(--border)] pt-6">
      <h2 className="font-hand mb-3 text-sm tracking-wide text-zinc-500 uppercase">
        {t('shareHeading')}
      </h2>
      <div className="flex flex-wrap gap-2">
        <a
          href={xHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('shareOnX')}
          className={baseBtn}
        >
          <span aria-hidden="true">𝕏</span>
          <span>X</span>
        </a>
        <a
          href={lineHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('shareOnLine')}
          className={baseBtn}
        >
          <span aria-hidden="true">💬</span>
          <span>LINE</span>
        </a>
        <button type="button" onClick={handleCopy} className={baseBtn}>
          <span aria-hidden="true">🔗</span>
          <span>{copied ? t('shareCopied') : t('shareCopy')}</span>
        </button>
      </div>
    </section>
  );
}
