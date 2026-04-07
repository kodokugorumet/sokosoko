import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './LocaleSwitcher';

export async function Header() {
  const t = await getTranslations();
  const navItems = [
    { key: 'life', href: '/life' },
    { key: 'study', href: '/study' },
    { key: 'trip', href: '/trip' },
    { key: 'qa', href: '/qa' },
    { key: 'about', href: '/about' },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/60 bg-[var(--background)]/80 backdrop-blur dark:border-zinc-800/60">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          {t('Brand.name')}
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-[var(--accent)] dark:text-zinc-300"
            >
              {t(`Nav.${item.key}`)}
            </Link>
          ))}
        </nav>
        <LocaleSwitcher />
      </div>
    </header>
  );
}
