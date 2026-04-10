'use client';

import { useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { uploadPostCover } from '@/lib/posts/cover-upload';

/**
 * Cover image upload field for the admin post form. Uploads go through
 * the `uploadPostCover` Server Action which in turn writes to the
 * `post-covers` Supabase Storage bucket. On success we stash the
 * returned public URL in a hidden field named `cover_image_url` so
 * the form's submit handler persists it alongside the other columns.
 *
 * Not a TipTap-style inline uploader — the cover is a single-image
 * concept and deserves a dedicated slot with preview + clear button.
 * Inline body images can come later in a dedicated phase.
 */

type Props = {
  initialUrl?: string | null;
};

export function CoverImageUpload({ initialUrl }: Props) {
  const t = useTranslations('Admin.posts.form.cover');
  const [url, setUrl] = useState<string>(initialUrl ?? '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    startTransition(async () => {
      const res = await uploadPostCover(formData);
      if (res.ok) {
        setUrl(res.url);
      } else {
        setError(res.error);
      }
    });
  }

  function handleClear() {
    setUrl('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const errorMessage = error
    ? (() => {
        switch (error) {
          case 'empty':
            return t('error.empty');
          case 'too-large':
            return t('error.tooLarge');
          case 'bad-type':
            return t('error.badType');
          default:
            return t('error.unknown');
        }
      })()
    : null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[var(--ink)]">{t('label')}</span>
      <span className="text-xs text-zinc-500">{t('hint')}</span>

      {url ? (
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- see PostCard note */}
          <img
            src={url}
            alt=""
            className="hand-box aspect-[16/9] w-full max-w-md rounded-md object-cover"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pending}
              className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--accent-soft)] disabled:opacity-60"
            >
              {t('replace')}
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={pending}
              className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              {t('clear')}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <label
            className={`hand-box inline-flex cursor-pointer items-center gap-2 rounded-md bg-[var(--background)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)] ${
              pending ? 'cursor-wait opacity-60' : ''
            }`}
          >
            <span>{pending ? t('uploading') : t('chooseFile')}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              disabled={pending}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      )}

      {errorMessage ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      {/* The PostForm's submit serialises this hidden input as
          cover_image_url alongside every other column. Setting it to an
          empty string when cleared is exactly what we want — the
          server action coerces empty to null. */}
      <input type="hidden" name="cover_image_url" value={url} />
    </div>
  );
}
