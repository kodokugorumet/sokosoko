'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
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
import { SearchBox } from '@/components/search/SearchBox';
import { LocaleSwitcher } from './LocaleSwitcher';
import { signOut } from '@/lib/auth/actions';

export type HeaderUser = {
  id: string;
  nickname: string;
  role: 'member' | 'verified' | 'operator' | 'admin';
  onboarded: boolean;
};

const ROLE_BADGE: Record<HeaderUser['role'], string> = {
  admin: '👑',
  operator: '🏅',
  verified: '✅',
  member: '',
};

/**
 * Client island for the header right side:
 * LOG IN (placeholder) + MENU button + slide-in MenuDrawer.
 * The drawer absorbs all navigation + footer items so the header
 * itself stays minimal (matches the wireframe).
 */
// Selector matching every focusable element inside the drawer. Used by the
// focus trap to find the first/last stops and to bounce Tab off the ends.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function HeaderActions({ user }: { user: HeaderUser | null }) {
  const t = useTranslations('Header');
  const tMenu = useTranslations('Menu');
  const tAuth = useTranslations('Auth');
  const [open, setOpen] = useState(false);
  // Anchor for restoring focus when the drawer closes — points to whatever
  // element opened it (the MENU button in the normal flow).
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

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

  // Focus trap: when the drawer opens, move focus inside it and intercept
  // Tab so the user can't escape into the inert background. When it closes,
  // restore focus to the trigger so screen reader / keyboard users land
  // back where they were.
  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    // Snapshot the trigger now so the cleanup function doesn't read a
    // stale ref (eslint react-hooks/exhaustive-deps).
    const trigger = triggerRef.current;

    // Defer one frame so the drawer's transform is applied before we focus,
    // otherwise some browsers refuse to focus an off-screen element.
    const focusFirst = () => {
      const items = drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      (items[0] ?? drawer).focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      // Backwards from the first item → wrap to last; forwards from the
      // last item → wrap to first. Anything outside the drawer is treated
      // as "before first" and bounced back to the first item.
      if (e.shiftKey) {
        if (active === first || !drawer.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleTab);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleTab);
      // Restore focus to the trigger only if the user didn't navigate
      // away (which would have moved focus elsewhere).
      trigger?.focus();
    };
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
        ref={drawerRef}
        id="site-menu-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={tMenu('title')}
        // tabIndex=-1 so focus() works as a fallback when the drawer
        // happens to contain zero focusable children.
        tabIndex={-1}
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
          {/* Search lives at the top of the drawer so the header stays
              minimal but the input is still one tap away. */}
          <div className="mb-4">
            <SearchBox onSubmitted={close} />
          </div>

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
            href="/community"
            onClick={close}
            className="mt-2 py-2 text-base font-medium hover:text-[var(--accent)]"
          >
            ● {tMenu('community')}
          </Link>

          <Link
            href="/about"
            onClick={close}
            className="mt-2 py-2 text-base font-medium hover:text-[var(--accent)]"
          >
            ● {tMenu('about')}
          </Link>

          {/* Auth block — visible on mobile (where the header pill is hidden)
              and useful on desktop too as a single source of truth for the
              session state. Admins/operators also see an Admin link here. */}
          <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            {user ? (
              <div className="flex flex-col gap-2">
                <p className="truncate text-sm">
                  <span className="text-zinc-500">{tAuth('header.signedInAs')}</span>{' '}
                  <span className="font-medium text-[var(--ink)]">
                    {ROLE_BADGE[user.role] ? `${ROLE_BADGE[user.role]} ` : ''}
                    {user.nickname}
                  </span>
                </p>
                {user.role === 'admin' || user.role === 'operator' ? (
                  <>
                    <Link
                      href="/admin/posts"
                      onClick={close}
                      className="hand-box rounded-md px-3 py-2 text-center text-xs font-medium hover:bg-[var(--accent-soft)]"
                    >
                      ✏️ Admin
                    </Link>
                    <Link
                      href="/admin/moderation"
                      onClick={close}
                      className="hand-box rounded-md px-3 py-2 text-center text-xs font-medium hover:bg-[var(--accent-soft)]"
                    >
                      🛡️ Moderation
                    </Link>
                    <Link
                      href="/admin/broadcast"
                      onClick={close}
                      className="hand-box rounded-md px-3 py-2 text-center text-xs font-medium hover:bg-[var(--accent-soft)]"
                    >
                      📢 Broadcast
                    </Link>
                  </>
                ) : null}
                <form action={signOut}>
                  <button
                    type="submit"
                    className="hand-box w-full rounded-md px-3 py-2 text-xs font-medium hover:bg-[var(--accent-soft)]"
                  >
                    {tAuth('header.signOut')}
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={close}
                className="hand-box block rounded-md px-3 py-2 text-center text-xs font-medium hover:bg-[var(--accent-soft)]"
              >
                {tAuth('header.signIn')}
              </Link>
            )}
          </div>
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
        {/* Auth pill: shows the nickname (with role badge) when signed in,
            falls back to a LOG IN link otherwise. Hidden on mobile to give
            the brand wordmark room — the drawer footer mirrors the same
            controls so mobile users still have access. */}
        {user ? (
          <Link
            href="/"
            className="hand-box hidden max-w-[10rem] truncate rounded-md px-3 py-1 text-xs font-medium tracking-wide whitespace-nowrap hover:bg-[var(--accent-soft)] sm:inline-flex"
            aria-label={user.nickname}
            title={user.nickname}
          >
            {ROLE_BADGE[user.role] ? `${ROLE_BADGE[user.role]} ` : ''}
            {user.nickname}
          </Link>
        ) : (
          <Link
            href="/login"
            className="hand-box hidden rounded-md px-3 py-1 text-xs font-medium tracking-wide whitespace-nowrap hover:bg-[var(--accent-soft)] sm:inline-flex"
            aria-label={t('login')}
          >
            {t('login')}
          </Link>
        )}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="site-menu-drawer"
          aria-haspopup="dialog"
          className="hand-box rounded-md px-3 py-1 text-xs font-medium tracking-wide whitespace-nowrap hover:bg-[var(--accent-soft)]"
        >
          {t('menu')}
        </button>
      </div>

      {isClient ? createPortal(overlay, document.body) : null}
    </>
  );
}
