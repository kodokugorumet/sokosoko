import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { HeaderActions } from './HeaderActions';

export async function Header() {
  const t = await getTranslations('Brand');

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/60 bg-[var(--background)]/90 backdrop-blur dark:border-zinc-800/60">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        {/* Brand mark — small logo always visible, wordmark hidden on mobile */}
        <Link href="/" className="flex items-center gap-2.5" aria-label={t('name')}>
          <Image
            src="/brand/logo.png"
            alt=""
            width={36}
            height={36}
            priority
            className="h-9 w-9 object-contain"
          />
          <span className="font-hand hidden text-base tracking-tight sm:inline sm:text-lg">
            {t('name')}
          </span>
        </Link>
        <HeaderActions />
      </div>
    </header>
  );
}
