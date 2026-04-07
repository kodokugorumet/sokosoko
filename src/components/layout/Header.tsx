import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { HeaderActions } from './HeaderActions';

export async function Header() {
  const t = await getTranslations('Brand');

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/60 bg-[var(--background)]/90 backdrop-blur dark:border-zinc-800/60">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-hand text-base tracking-tight underline decoration-1 underline-offset-4 sm:text-lg"
        >
          {t('name')}
        </Link>
        <HeaderActions />
      </div>
    </header>
  );
}
