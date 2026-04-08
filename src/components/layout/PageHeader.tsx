import type { ReactNode } from 'react';

/**
 * Reusable page header for static/content pages (About, Contact, etc.).
 * Matches the wireframe: large handwritten title, subtitle, thin underline accent.
 * Home page uses its own custom hero instead of this component.
 */
export function PageHeader({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <header className="mb-12 border-b border-[var(--border)] pb-8 sm:mb-16">
      <h1 className="font-hand text-4xl tracking-wide text-[var(--ink)] sm:text-6xl">{title}</h1>
      {subtitle ? (
        <p className="mt-4 text-sm text-zinc-500 sm:text-base dark:text-zinc-400">{subtitle}</p>
      ) : null}
    </header>
  );
}
