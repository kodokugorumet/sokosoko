'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Sign the current user out and bounce home. Lives in `src/lib/auth/`
 * (not under a route folder) so any component — Header, account dropdown,
 * /settings page — can import the same action without circular boundaries.
 *
 * `revalidatePath('/', 'layout')` invalidates every page that read the
 * session in a Server Component, so the Header re-renders without the
 * "Hi, nickname" pill on the next navigation.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
