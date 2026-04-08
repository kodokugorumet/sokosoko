import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function Footer() {
  const t = await getTranslations('Footer');
  return (
    <footer className="border-t border-zinc-200/60 py-8 dark:border-zinc-800/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-6 text-xs text-zinc-500 sm:flex-row sm:justify-between">
        <div className="text-zinc-400">{t('copyright', { year: new Date().getFullYear() })}</div>
        <nav className="flex items-center gap-5">
          <Link href="/about" className="hover:text-[var(--accent)]">
            {t('about')}
          </Link>
          <Link href="/contact" className="hover:text-[var(--accent)]">
            {t('contact')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
