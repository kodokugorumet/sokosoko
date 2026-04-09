'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Server action: validate + persist the user's chosen nickname and flip
 * `onboarded` to true. On success, redirect home so the next page load
 * picks up the new profile state.
 *
 * Validation rules (intentionally permissive but safe):
 *  - 2–24 chars (Unicode counted by `Array.from(...).length` so CJK is 1)
 *  - allowed: letters (any script), digits, `_`, `-`, `.`
 *  - reserved prefixes blocked: `admin`, `system`, `user_` (the last is
 *    used as the placeholder name created on signup)
 *  - uniqueness enforced by the DB unique constraint, surfaced as a
 *    friendly error code rather than a stack trace.
 */
export async function saveNickname(formData: FormData) {
  const raw = String(formData.get('nickname') ?? '').trim();

  if (!raw) return { ok: false as const, error: 'empty' };
  const length = Array.from(raw).length;
  if (length < 2) return { ok: false as const, error: 'too-short' };
  if (length > 24) return { ok: false as const, error: 'too-long' };
  if (!/^[\p{L}\p{N}_.\-]+$/u.test(raw)) return { ok: false as const, error: 'invalid-chars' };
  const lowered = raw.toLowerCase();
  if (lowered.startsWith('admin') || lowered.startsWith('system') || lowered.startsWith('user_')) {
    return { ok: false as const, error: 'reserved' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'unauthorized' };

  const { error } = await supabase
    .from('profiles')
    .update({ nickname: raw, onboarded: true, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) {
    // Postgres unique violation → 23505. Surface a clean code so the form
    // can show "이 닉네임은 이미 사용 중이에요".
    if (error.code === '23505') return { ok: false as const, error: 'taken' };
    return { ok: false as const, error: error.message };
  }

  // Invalidate every Server Component that read the profile row (Header,
  // in particular) so the nickname and the 👑/🏅/✅ role badge reflect the
  // new value on the next render instead of showing the `user_xxxxxxxx`
  // placeholder from the initial signup.
  revalidatePath('/', 'layout');
  redirect('/');
}
