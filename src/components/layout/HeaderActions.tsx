'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

// Client-only mount check via useSyncExternalStore — returns false on SSR,
// true after hydration on the client. Avoids the `setState in effect` lint
// rule and produces correct hydration output.
const subscribe = () => () => {};
const useIsClient = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './LocaleSwitcher';

/**
 * Client island for the header right side:
 * LOG IN (placeholder) + MENU button + slide-in MenuDrawer.
 * The drawer absorbs all navigation + footer items so the header
 * itself stays minimal (matches the wireframe).
 */
export function HeaderActions() {
  const t = useTranslations('Header');
  const tMenu = useTranslations('Menu');
  const [open, setOpen] = useState(false);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const original = document.body.style.overflow;
    document.body.style.overflow = open ? 'hidden' : original;
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const close = () => setOpen(false);

  // The header has `backdrop-blur`, which makes it the containing block for any
  // descendant `position: fixed` element (per CSS spec on transform/filter/backdrop-filter).
  // Rendering the drawer + backdrop via a portal to <body> escapes that and keeps
  // them anchored to the viewport.
  const isClient = useIsClient();

  const overlay = (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Drawer */}
      <aside
        id="site-menu-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={tMenu('title')}
        className={`fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-[var(--background)] shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <span className="font-hand text-lg">{tMenu('title')}</span>
          <button
            type="button"
            onClick={close}
            aria-label={tMenu('close')}
            className="rounded-md p-2 text-2xl leading-none hover:bg-[var(--muted)]"
          >
            ×
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-6 py-6">
          <Link
            href="/"
            onClick={close}
            className="py-2 text-base font-medium hover:text-[var(--accent)]"
          >
            ○ {tMenu('topPage')}
          </Link>

          <div className="mt-2">
            <p className="py-2 text-base font-medium">● {tMenu('blog')}</p>
            <ul className="ml-5 flex flex-col gap-1 text-sm">
              <li>
                <Link
                  href="/life"
                  onClick={close}
                  className="block py-1 text-zinc-600 hover:text-[var(--accent)] dark:text-zinc-400"
                >
                  – Life
                </Link>
              </li>
              <li>
                <Link
                  href="/study"
                  onClick={close}
                  className="block py-1 text-zinc-600 hover:text-[var(--accent)] dark:text-zinc-400"
                >
                  – Study Abroad / Work
                </Link>
              </li>
              <li>
                <Link
                  href="/trip"
                  onClick={close}
                  className="block py-1 text-zinc-600 hover:text-[var(--accent)] dark:text-zinc-400"
                >
                  – Trip
                </Link>
              </li>
            </ul>
          </div>

          <Link
            href="/qa"
            onClick={close}
            className="mt-2 py-2 text-base font-medium hover:text-[var(--accent)]"
          >
            ● {tMenu('qa')}
          </Link>

          <Link
            href="/about"
            onClick={close}
            className="mt-2 py-2 text-base font-medium hover:text-[var(--accent)]"
          >
            ● {tMenu('about')}
          </Link>
        </nav>

        <div className="border-t border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <div className="mb-3 flex items-center gap-4 text-xs text-zinc-500">
            <a
              href="https://instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tMenu('instagram')}
              className="hover:text-[var(--accent)]"
            >
              {/* Inline IG glyph */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
              </svg>
            </a>
            <Link href="/privacy" onClick={close} className="hover:text-[var(--accent)]">
              {tMenu('privacyPolicy')}
            </Link>
            <Link href="/terms" onClick={close} className="hover:text-[var(--accent)]">
              {tMenu('termsOfUse')}
            </Link>
            <Link href="/contact" onClick={close} className="hover:text-[var(--accent)]">
              {tMenu('contact')}
            </Link>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-zinc-500">{tMenu('language')}</span>
            <LocaleSwitcher />
          </div>
        </div>
      </aside>
    </>
  );

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <LocaleSwitcher />
        {/* LOG IN is a placeholder until Phase 2 — hide on mobile to give
            the brand wordmark room. Drawer footer still has Language. */}
        <button
          type="button"
          onClick={() => alert(t('loginComingSoon'))}
          className="hand-box hidden rounded-md px-3 py-1 text-xs font-medium tracking-wide whitespace-nowrap hover:bg-[var(--accent-soft)] sm:inline-flex"
          aria-label={t('login')}
        >
          {t('login')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="site-menu-drawer"
          className="hand-box rounded-md px-3 py-1 text-xs font-medium tracking-wide whitespace-nowrap hover:bg-[var(--accent-soft)]"
        >
          {t('menu')}
        </button>
      </div>

      {isClient ? createPortal(overlay, document.body) : null}
    </>
  );
}
