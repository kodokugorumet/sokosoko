import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { HeaderActions } from './HeaderActions';

export async function Header() {
  const t = await getTranslations('Brand');

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/60 bg-[var(--background)]/90 backdrop-blur dark:border-zinc-800/60">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        {/* Brand mark — logo + wordmark, always visible. Wordmark scales
            down on mobile so it fits next to the LOG IN / MENU buttons. */}
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 sm:gap-2.5"
          aria-label={t('name')}
        >
          <Image
            src="/brand/logo.png"
            alt=""
            width={36}
            height={36}
            priority
            className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9"
          />
          <span className="font-hand truncate text-sm tracking-tight text-[var(--ink)] sm:text-lg">
            {t('name')}
          </span>
        </Link>
        <HeaderActions />
      </div>
    </header>
  );
}
