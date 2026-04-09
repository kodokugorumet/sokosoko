'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

/**
 * Server action: send a magic link to `email`. Returns a structured result
 * the client form can branch on without throwing across the boundary.
 *
 * The `emailRedirectTo` URL is built from the incoming request's host so
 * it works for localhost, Vercel preview deployments, and production
 * without env-var juggling. Supabase's allowlist (configured in the
 * dashboard under Authentication → URL Configuration) still has to permit
 * each host you actually use.
 */
export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) {
    return { ok: false as const, error: 'empty' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, error: 'invalid' };
  }

  const headerList = await headers();
  const host = headerList.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const redirectTo = `${protocol}://${host}/auth/callback`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}
