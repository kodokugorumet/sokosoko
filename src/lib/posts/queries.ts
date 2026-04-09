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

// ---------------------------------------------------------------------------
// Q&A helpers — questions live in the `posts` table under board_slug='qa'.
// Answers live in the separate `answers` table keyed by question_id → posts.id.
// ---------------------------------------------------------------------------

export type UserRole = 'member' | 'verified' | 'operator' | 'admin';

/** Lightweight question-list row with the author nickname + badge. */
export type QuestionListRow = {
  id: string;
  slug: string;
  title_ja: string | null;
  title_ko: string | null;
  excerpt_ja: string | null;
  excerpt_ko: string | null;
  published_at: string | null;
  created_at: string;
  author: { nickname: string; role: UserRole };
  answer_count: number;
};

/** Full question detail for the public page. */
export type QuestionDetailRow = PublicPostRow;

/** Answer row with joined author profile (nickname + role for sort/badge). */
export type AnswerRow = {
  id: string;
  question_id: string;
  body_ja: JSONContent | null;
  body_ko: JSONContent | null;
  helpful_count: number;
  created_at: string;
  author: { id: string; nickname: string; role: UserRole };
};

/**
 * Published questions, newest first. Separate from `listPostsByAuthor`
 * because the reader's Q&A index is very different from the admin's "my
 * posts" list — different columns, different ordering, different privacy.
 */
export async function listPublishedQuestions(): Promise<QuestionListRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select(
      `id, slug, title_ja, title_ko, excerpt_ja, excerpt_ko, published_at, created_at,
       author:profiles!author_id (nickname, role),
       answers (id)`,
    )
    .eq('board_slug', 'qa')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(100);
  if (error) throw error;

  // PostgREST returns joined rows as arrays even on a FK. Normalise author
  // and count the embedded answers.
  return (data ?? []).map((row) => {
    const authorRaw = (row as { author: QuestionListRow['author'] | QuestionListRow['author'][] })
      .author;
    const author = Array.isArray(authorRaw) ? authorRaw[0] : authorRaw;
    const answers = (row as { answers: { id: string }[] | null }).answers ?? [];
    return {
      id: row.id,
      slug: row.slug,
      title_ja: row.title_ja,
      title_ko: row.title_ko,
      excerpt_ja: row.excerpt_ja,
      excerpt_ko: row.excerpt_ko,
      published_at: row.published_at,
      created_at: row.created_at,
      author,
      answer_count: answers.length,
    };
  });
}

/**
 * Single published question by slug. Returns null if not found or still a
 * draft — RLS enforces the status check but we double-filter here so a
 * missing row shows up as a clean 404 rather than an RLS error.
 */
export async function getQuestionBySlug(slug: string): Promise<QuestionDetailRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select(
      `id, board_slug, slug, title_ja, title_ko, excerpt_ja, excerpt_ko, body_ja, body_ko, cover_image_url, status, published_at, updated_at, created_at,
       author:profiles!author_id (nickname, role)`,
    )
    .eq('board_slug', 'qa')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as AdminPostRow & {
    author: PublicPostRow['author'] | PublicPostRow['author'][];
  };
  const author = Array.isArray(row.author) ? row.author[0] : row.author;
  if (!author) return null;
  return { ...row, author };
}

/**
 * All answers for a question, **ordered by trust tier first** so the
 * admin / operator / verified reply rises to the top no matter when it
 * was written. Within a tier: newest helpful_count first, then oldest
 * created_at first so longstanding answers don't get buried under fresh
 * low-quality ones.
 *
 * The tier ordering is expressed via a `case` inside `order`, but
 * PostgREST doesn't support computed column ordering directly, so we
 * sort client-side after the fetch. Cheap — Q&A threads are tiny.
 */
export async function listAnswersForQuestion(questionId: string): Promise<AnswerRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('answers')
    .select(
      `id, question_id, body_ja, body_ko, helpful_count, created_at,
       author:profiles!author_id (id, nickname, role)`,
    )
    .eq('question_id', questionId);
  if (error) throw error;

  const ROLE_RANK: Record<UserRole, number> = {
    admin: 0,
    operator: 1,
    verified: 2,
    member: 3,
  };

  const rows = (data ?? []).map((row) => {
    const authorRaw = (row as { author: AnswerRow['author'] | AnswerRow['author'][] }).author;
    const author = Array.isArray(authorRaw) ? authorRaw[0] : authorRaw;
    return {
      id: row.id,
      question_id: row.question_id,
      body_ja: row.body_ja as JSONContent | null,
      body_ko: row.body_ko as JSONContent | null,
      helpful_count: row.helpful_count,
      created_at: row.created_at,
      author,
    };
  });

  rows.sort((a, b) => {
    const rankDiff = ROLE_RANK[a.author.role] - ROLE_RANK[b.author.role];
    if (rankDiff !== 0) return rankDiff;
    if (b.helpful_count !== a.helpful_count) return b.helpful_count - a.helpful_count;
    return a.created_at < b.created_at ? -1 : 1;
  });

  return rows;
}

/** All published question slugs — used by the sitemap. */
export async function listAllQuestionSlugs(): Promise<
  { slug: string; updated_at: string; published_at: string | null }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('slug, updated_at, published_at')
    .eq('board_slug', 'qa')
    .eq('status', 'published');
  if (error) throw error;
  return data ?? [];
}
