'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { markAllRead } from '@/lib/notifications/actions';

export function MarkAllReadButton() {
  const t = useTranslations('Notifications');
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => markAllRead())}
      disabled={pending}
      className="hand-box rounded-md px-3 py-1.5 text-xs font-medium hover:bg-[var(--accent-soft)] disabled:opacity-60"
    >
      {pending ? '...' : t('markAllRead')}
    </button>
  );
}
