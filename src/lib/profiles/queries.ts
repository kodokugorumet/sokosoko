import { createClient } from '@/lib/supabase/server';
import type { UserRole, PublicPostCardRow, QuestionListRow } from '@/lib/posts/queries';

/**
 * Profile query helpers. Separated from `posts/queries.ts` because
 * profile pages need a different shape: "everything by this author"
 * rather than "everything in this board".
 */

export type PublicProfile = {
  id: string;
  nickname: string;
  role: UserRole;
  bio_ja: string | null;
  bio_ko: string | null;
  avatar_url: string | null;
  created_at: string;
};

/**
 * Fetch a public profile by nickname. Returns null if the nickname
 * doesn't exist or the user hasn't finished onboarding.
 */
export async function getProfileByNickname(nickname: string): Promise<PublicProfile | null> {
  const supabase = await createClient();

  let decoded = nickname;
  try {
    decoded = decodeURIComponent(nickname);
  } catch {
    /* malformed — use raw */
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, role, bio_ja, bio_ko, avatar_url, created_at')
    .eq('nickname', decoded)
    .eq('onboarded', true)
    .maybeSingle();
  if (error) {
    console.error('[getProfileByNickname] query failed', { nickname, error });
    throw error;
  }
  return (data as PublicProfile | null) ?? null;
}

/**
 * Published posts by a given author, newest first. Used on the profile
 * page's "Posts" tab. Two-step lookup (posts with author_id filter →
 * already know the profile, so no join needed for the author byline).
 */
export async function listPublishedPostsByAuthor(authorId: string): Promise<PublicPostCardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select(
      'id, board_slug, slug, title_ja, title_ko, excerpt_ja, excerpt_ko, cover_image_url, published_at, created_at',
    )
    .eq('author_id', authorId)
    .eq('status', 'published')
    .neq('board_slug', 'qa')
    .order('published_at', { ascending: false })
    .limit(50);
  if (error) {
    console.error('[listPublishedPostsByAuthor] query failed', { authorId, error });
    throw error;
  }
  // We already have the profile; stub it in so PublicPostCardRow shape is satisfied.
  return ((data ?? []) as Array<Omit<PublicPostCardRow, 'author'>>).map((p) => ({
    ...p,
    author: { nickname: '', role: 'member' as UserRole },
  }));
}

/**
 * Published questions by a given author.
 */
export async function listPublishedQuestionsByAuthor(authorId: string): Promise<QuestionListRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('id, slug, title_ja, title_ko, excerpt_ja, excerpt_ko, published_at, created_at')
    .eq('author_id', authorId)
    .eq('board_slug', 'qa')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50);
  if (error) {
    console.error('[listPublishedQuestionsByAuthor] query failed', { authorId, error });
    throw error;
  }
  return ((data ?? []) as Array<Omit<QuestionListRow, 'author' | 'answer_count'>>).map((q) => ({
    ...q,
    author: { nickname: '', role: 'member' as UserRole },
    answer_count: 0,
  }));
}
