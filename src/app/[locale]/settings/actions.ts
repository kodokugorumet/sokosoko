'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/require-role';

/**
 * Server action: update the current user's profile fields.
 *
 * Validation:
 *  - nickname: 2–24 chars, letters/digits/`_`/`-`/`.`, no reserved prefixes
 *    (same rules as onboarding/actions.ts)
 *  - bio_ja / bio_ko: max 300 chars each (optional)
 *
 * Avatar URL is NOT handled here — that would come from a separate
 * Supabase Storage upload action (like cover-upload.ts) in a future PR.
 */

export async function updateProfile(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: 'unauthorized' };
  if (!user.onboarded) return { ok: false as const, error: 'unauthorized' };

  const nickname = String(formData.get('nickname') ?? '').trim();
  const bioJa =
    String(formData.get('bio_ja') ?? '')
      .trim()
      .slice(0, 300) || null;
  const bioKo =
    String(formData.get('bio_ko') ?? '')
      .trim()
      .slice(0, 300) || null;

  // Nickname validation (same rules as onboarding)
  if (!nickname) return { ok: false as const, error: 'empty' };
  const length = Array.from(nickname).length;
  if (length < 2) return { ok: false as const, error: 'too-short' };
  if (length > 24) return { ok: false as const, error: 'too-long' };
  if (!/^[\p{L}\p{N}_.\-]+$/u.test(nickname)) {
    return { ok: false as const, error: 'invalid-chars' };
  }
  const lowered = nickname.toLowerCase();
  if (lowered.startsWith('admin') || lowered.startsWith('system') || lowered.startsWith('user_')) {
    return { ok: false as const, error: 'reserved' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      nickname,
      bio_ja: bioJa,
      bio_ko: bioKo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    if (error.code === '23505') return { ok: false as const, error: 'taken' };
    return { ok: false as const, error: error.message };
  }

  // Invalidate every page that reads the profile (header, user page, etc.)
  revalidatePath('/', 'layout');
  return { ok: true as const };
}
