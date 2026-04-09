import { type NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

/**
 * Magic-link callback endpoint. Lives outside `[locale]` because the link
 * Supabase emails is canonical (`/auth/callback?code=...`) and the user
 * arrives here from their inbox without any locale context.
 *
 * Flow:
 *   1. Supabase redirected the user here with a one-time `code` query param.
 *   2. We exchange it for a session (cookies attached automatically by the
 *      server client because Server Component cookie writes succeed inside
 *      a Route Handler — unlike a plain Server Component).
 *   3. If the user hasn't completed onboarding (no real nickname yet) we
 *      bounce them to `/onboarding`. Otherwise back to home.
 *
 * The optional `next` query param lets callers (e.g. a future "log in to
 * comment" deep link) override the post-login destination, but we
 * sanity-check it stays same-origin to avoid open-redirect.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const nextParam = url.searchParams.get('next') ?? '/';

  // Open-redirect guard: only allow same-origin paths starting with `/`,
  // not protocol-relative `//evil.com` or absolute URLs.
  const safeNext = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/login?error=not-configured', url.origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing-code', url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  // Check onboarding status. If profiles row exists and `onboarded=true`,
  // honour `next`; otherwise force onboarding first.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile?.onboarded) {
      return NextResponse.redirect(new URL('/onboarding', url.origin));
    }
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
