'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';

/**
 * Upload a cover image to the `post-covers` Supabase Storage bucket and
 * return the public URL. Called from the admin post form as a Server
 * Action — never exposed via a Route Handler because the authorization
 * is done by `requireRole` which wants real Server Component context.
 *
 * Validation:
 *   - file size ≤ 5 MB (storage bucket also enforces this but we bail
 *     early with a clean error before the upload round-trip)
 *   - MIME type whitelist (jpeg/png/webp/avif)
 *
 * Path layout:
 *   post-covers/YYYY/MM/<uuid>.<ext>
 *
 * We intentionally never reuse filenames — even if the author uploads
 * the same `hero.jpg` twice, each upload gets a fresh uuid. That
 * eliminates cache-buster headaches and the author can delete old
 * covers at leisure from Supabase Studio.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

function extFor(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/avif':
      return 'avif';
    default:
      return 'bin';
  }
}

export type CoverUploadResult =
  | { ok: true; url: string; path: string }
  | { ok: false; error: 'empty' | 'too-large' | 'bad-type' | 'upload-failed' };

export async function uploadPostCover(formData: FormData): Promise<CoverUploadResult> {
  // Operators + admins only. requireRole throws a redirect on fail,
  // which is exactly the right behaviour — the user gets bounced to
  // /login and the action call returns without completing.
  await requireRole('operator');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: 'empty' };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false as const, error: 'too-large' };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false as const, error: 'bad-type' };
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const id = crypto.randomUUID();
  const path = `${year}/${month}/${id}.${extFor(file.type)}`;

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage.from('post-covers').upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000, immutable',
    upsert: false,
  });

  if (uploadError) {
    console.error('[uploadPostCover] upload failed', { path, uploadError });
    return { ok: false as const, error: 'upload-failed' };
  }

  const { data: publicUrl } = supabase.storage.from('post-covers').getPublicUrl(path);
  return { ok: true as const, url: publicUrl.publicUrl, path };
}
