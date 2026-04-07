import { getTranslations } from 'next-intl/server';

export async function Footer() {
  const t = await getTranslations('Footer');
  return (
    <footer className="py-8">
      <div className="mx-auto w-full max-w-6xl px-6 text-center text-xs text-zinc-400">
        {t('copyright', { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
