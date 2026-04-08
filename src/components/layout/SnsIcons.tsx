import { getTranslations } from 'next-intl/server';

/**
 * Site-wide SNS icon row. Rendered in the Footer and reusable anywhere else
 * a social follow block is needed (e.g., blog post share bar in Phase A).
 *
 * All `href` values are placeholders for Phase 1 — accounts will be opened
 * and linked up gradually. Icons stay visible so the row has a consistent
 * shape; clicking an unlinked icon simply no-ops (renders as a span).
 */
const LINKS = [
  { key: 'instagram', href: null },
  { key: 'x', href: null },
  { key: 'line', href: null },
  { key: 'note', href: null },
] as const;

type SnsKey = (typeof LINKS)[number]['key'];

function Icon({ name }: { name: SnsKey }) {
  const common = {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    width: 20,
    height: 20,
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'instagram':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
        </svg>
      );
    case 'x':
      return (
        <svg {...common}>
          <path d="M4 4l16 16M20 4L4 20" />
        </svg>
      );
    case 'line':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="14" rx="4" />
          <path d="M8 10v4M16 10v4M12 10v2l2 2" />
        </svg>
      );
    case 'note':
      return (
        <svg {...common}>
          <path d="M6 4h9l5 5v11a0 0 0 0 1 0 0H6z" />
          <path d="M15 4v5h5" />
          <path d="M9 13h6M9 17h4" />
        </svg>
      );
  }
}

export async function SnsIcons({ className = '' }: { className?: string }) {
  const t = await getTranslations('Footer.sns');
  return (
    <ul className={`flex items-center gap-4 ${className}`}>
      {LINKS.map((l) => {
        const label = t(l.key);
        const inner = (
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-zinc-600 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] dark:text-zinc-400"
            aria-label={label}
          >
            <Icon name={l.key} />
          </span>
        );
        return (
          <li key={l.key}>
            {l.href ? (
              <a href={l.href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                {inner}
              </a>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
