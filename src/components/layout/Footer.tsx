import { getTranslations } from 'next-intl/server';

export async function Footer() {
  const t = await getTranslations('Footer');
  return (
    <footer className="border-t border-zinc-200/60 py-10 dark:border-zinc-800/60">
      <div className="mx-auto w-full max-w-6xl px-6 text-center text-sm text-zinc-500">
        {t('copyright', { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
