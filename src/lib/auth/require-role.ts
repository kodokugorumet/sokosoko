import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export type UserRole = 'member' | 'verified' | 'operator' | 'admin';

export type SessionUser = {
  id: string;
  email: string | null;
  nickname: string;
  role: UserRole;
  onboarded: boolean;
};

/**
 * Load the current user + profile in one round trip for Server Components
 * that need auth state. Returns null if logged out, Supabase isn't
 * configured, or the profile row somehow doesn't exist yet (shouldn't
 * happen because of the on_auth_user_created trigger, but defensively
 * handled).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, role, onboarded')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    nickname: profile.nickname,
    role: profile.role as UserRole,
    onboarded: profile.onboarded,
  };
}

const ROLE_RANK: Record<UserRole, number> = {
  member: 0,
  verified: 1,
  operator: 2,
  admin: 3,
};

/**
 * Gate a Server Component or Server Action on a minimum role. Bounces to
 * /login when logged out, /onboarding when signed in but nickname not
 * yet set, and home with no explanation when the role isn't high enough
 * (we don't expose "admin area exists" to regular members).
 */
export async function requireRole(minimum: UserRole): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!user.onboarded) redirect('/onboarding');
  if (ROLE_RANK[user.role] < ROLE_RANK[minimum]) redirect('/');
  return user;
}
