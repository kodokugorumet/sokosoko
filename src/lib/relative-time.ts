/**
 * Timezone-independent relative time formatter.
 *
 * "Server Component rendering has no meaningful locale" is only true
 * for absolute wall-clock formatting — relative durations ("3 minutes
 * ago", "5 days ago") are computed from a pair of UTC instants and
 * don't depend on the reader's timezone at all. So the server can
 * render "3 分前" / "3분 전" safely, the client will agree on
 * hydration, and nothing flashes.
 *
 * Anything older than 7 days falls through to a plain `YYYY-MM-DD`
 * ISO date because "47 weeks ago" reads worse than "2025-11-20".
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export type Locale = 'ja' | 'ko';

type Units = {
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
  daysAgo: (n: number) => string;
};

const JA: Units = {
  justNow: 'たった今',
  minutesAgo: (n) => `${n} 分前`,
  hoursAgo: (n) => `${n} 時間前`,
  daysAgo: (n) => `${n} 日前`,
};

const KO: Units = {
  justNow: '방금 전',
  minutesAgo: (n) => `${n}분 전`,
  hoursAgo: (n) => `${n}시간 전`,
  daysAgo: (n) => `${n}일 전`,
};

export function formatRelativeTime(iso: string, locale: Locale = 'ja'): string {
  const units = locale === 'ko' ? KO : JA;
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = now - then;

  // Future dates shouldn't happen for comments / posts but handle
  // gracefully just in case a clock is off. Fall through to the
  // absolute date so we don't show "-3 minutes ago".
  if (diffMs < 0) return iso.slice(0, 10);

  if (diffMs < 60 * SECOND) return units.justNow;
  if (diffMs < HOUR) return units.minutesAgo(Math.floor(diffMs / MINUTE));
  if (diffMs < DAY) return units.hoursAgo(Math.floor(diffMs / HOUR));
  if (diffMs < WEEK) return units.daysAgo(Math.floor(diffMs / DAY));

  // Older than a week — ISO date. Timezone-agnostic so SSR/CSR match.
  return iso.slice(0, 10);
}
