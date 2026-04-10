'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

/**
 * Three-state theme toggle: system → light → dark → system.
 *
 * Uses `useSyncExternalStore` to read localStorage without triggering
 * the react-hooks/set-state-in-effect lint rule. The inline script in
 * layout.tsx applies the `.dark` class synchronously before the first
 * paint, so there's zero flash regardless of the stored preference.
 */

type Theme = 'system' | 'light' | 'dark';

const CYCLE: Theme[] = ['system', 'light', 'dark'];
const ICONS: Record<Theme, string> = {
  system: '🖥️',
  light: '☀️',
  dark: '🌙',
};

// External store: localStorage 'theme' key.
const listeners = new Set<() => void>();
function subscribeThemeStore(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getThemeSnapshot(): Theme {
  if (typeof window === 'undefined') return 'system';
  const v = localStorage.getItem('theme');
  if (v === 'light' || v === 'dark') return v;
  return 'system';
}
function getThemeServerSnapshot(): Theme {
  return 'system';
}
function setThemeStore(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', isDark);
  if (theme === 'system') {
    localStorage.removeItem('theme');
  } else {
    localStorage.setItem('theme', theme);
  }
  // Notify all subscribers so useSyncExternalStore re-renders.
  listeners.forEach((cb) => cb());
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeThemeStore, getThemeSnapshot, getThemeServerSnapshot);

  // Listen for OS-level changes when in 'system' mode.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (getThemeSnapshot() === 'system') {
        document.documentElement.classList.toggle('dark', mq.matches);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const cycle = useCallback(() => {
    const idx = CYCLE.indexOf(theme);
    const next = CYCLE[(idx + 1) % CYCLE.length];
    setThemeStore(next);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${theme}`}
      title={`Theme: ${theme}`}
      className="hand-box rounded-md px-2 py-1 text-sm leading-none hover:bg-[var(--accent-soft)]"
    >
      {ICONS[theme]}
    </button>
  );
}
