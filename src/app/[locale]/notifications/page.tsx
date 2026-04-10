import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getSessionUser } from '@/lib/auth/require-role';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { listNotifications, type NotificationRow } from '@/lib/notifications/queries';
import { formatRelativeTime, type Locale } from '@/lib/relative-time';
import type { UserRole } from '@/lib/posts/queries';
import { MarkAllReadButton } from './MarkAllReadButton';

type Params = { locale: string };

const ROLE_BADGE: Record<UserRole, string> = {
  admin: '👑',
  operator: '🏅',
  verified: '✅',
  member: '',
};

const KIND_ICON: Record<NotificationRow['kind'], string> = {
  comment: '💬',
  answer: '💡',
  helpful_vote: '👍',
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Notifications' });
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function NotificationsPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) redirect('/login');
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const t = await getTranslations('Notifications');
  const loc = locale as Locale;

  const notifications = await listNotifications(user.id).catch(() => []);
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10 sm:py-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-hand text-3xl tracking-wide text-[var(--ink)] sm:text-4xl">
          {t('heading')}
        </h1>
        {hasUnread ? <MarkAllReadButton /> : null}
      </div>

      {notifications.length === 0 ? (
        <div className="hand-box rounded-md bg-[var(--accent-soft)] p-10 text-center">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{t('empty')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => {
            const badge = ROLE_BADGE[n.actor.role];
            const icon = KIND_ICON[n.kind];
            const kindLabel = t(`kind.${n.kind}`);
            // Link to the post if we have one; otherwise just render inline.
            const href = n.post_id ? `/p/${n.post_id}` : undefined;

            return (
              <li key={n.id}>
                <div
                  className={`hand-box flex items-start gap-3 rounded-md p-3 text-sm ${
                    n.read ? 'bg-[var(--background)] opacity-70' : 'bg-[var(--accent-soft)]'
                  }`}
                >
                  <span className="mt-0.5 text-lg">{icon}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p>
                      <span className="font-medium text-[var(--ink)]">
                        {badge ? `${badge} ` : ''}
                        {n.actor.nickname}
                      </span>{' '}
                      <span className="text-zinc-600 dark:text-zinc-400">{kindLabel}</span>
                    </p>
                    {n.preview ? (
                      <p className="line-clamp-2 text-xs text-zinc-500">{n.preview}</p>
                    ) : null}
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <time dateTime={n.created_at}>{formatRelativeTime(n.created_at, loc)}</time>
                      {href ? (
                        <Link
                          href={href}
                          className="underline-offset-2 hover:text-[var(--accent)] hover:underline"
                        >
                          {t('viewPost')}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
