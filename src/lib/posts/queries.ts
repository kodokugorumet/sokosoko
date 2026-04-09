import type { JSONContent } from '@tiptap/core';
import { createClient } from '@/lib/supabase/server';

/**
 * Shared query helpers for the Supabase `posts` table. One place so the
 * list, detail, and edit pages all use the same column selection and the
 * same TypeScript shape — if the schema changes, only this file moves.
 */

export type PostStatus = 'draft' | 'pending' | 'published' | 'rejected';

/** Row as returned by the admin-scoped queries (all columns the editor needs). */
export type AdminPostRow = {
  id: string;
  board_slug: string;
  slug: string;
  title_ja: string | null;
  title_ko: string | null;
  excerpt_ja: string | null;
  excerpt_ko: string | null;
  body_ja: JSONContent | null;
  body_ko: JSONContent | null;
  cover_image_url: string | null;
  status: PostStatus;
  published_at: string | null;
  updated_at: string;
  created_at: string;
};

/** Row as returned by the public detail query, with joined author info. */
export type PublicPostRow = AdminPostRow & {
  author: {
    nickname: string;
    role: 'member' | 'verified' | 'operator' | 'admin';
  };
};

/** Lightweight shape for list views — avoids pulling body_* jsonb. */
export type PostListRow = Pick<
  AdminPostRow,
  'id' | 'board_slug' | 'slug' | 'title_ja' | 'title_ko' | 'status' | 'published_at' | 'updated_at'
>;

/** All posts authored by a given user, newest first. Used by /admin/posts. */
export async function listPostsByAuthor(authorId: string): Promise<PostListRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('id, board_slug, slug, title_ja, title_ko, status, published_at, updated_at')
    .eq('author_id', authorId)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as PostListRow[];
}

/** Single post by id, including body jsonb. Returns null if not found. */
export async function getAdminPostById(id: string): Promise<AdminPostRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select(
      'id, board_slug, slug, title_ja, title_ko, excerpt_ja, excerpt_ko, body_ja, body_ko, cover_image_url, status, published_at, updated_at, created_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as AdminPostRow | null) ?? null;
}

/** Public detail query — joins author profile for the byline + role badge. */
export async function getPublicPostById(id: string): Promise<PublicPostRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select(
      `id, board_slug, slug, title_ja, title_ko, excerpt_ja, excerpt_ko, body_ja, body_ko, cover_image_url, status, published_at, updated_at, created_at,
       author:profiles!author_id (nickname, role)`,
    )
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // `author` comes back as an array from PostgREST joins even on a single
  // FK — collapse to an object.
  const row = data as unknown as AdminPostRow & {
    author: PublicPostRow['author'] | PublicPostRow['author'][];
  };
  const author = Array.isArray(row.author) ? row.author[0] : row.author;
  if (!author) return null;
  return { ...row, author };
}

/** List every configured board — used by the create form's board selector. */
export type BoardRow = {
  slug: string;
  name_ja: string;
  name_ko: string;
  kind: 'article' | 'qa';
  allow_member_post: boolean;
  sort_order: number;
};

export async function listBoards(): Promise<BoardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('boards')
    .select('slug, name_ja, name_ko, kind, allow_member_post, sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BoardRow[];
}
