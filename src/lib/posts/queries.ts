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

/**
 * Public detail query. Implemented as **two sequential queries** instead
 * of a PostgREST embedded join (`author:profiles!author_id(...)`) because
 * the embed syntax proved flaky against our current Supabase schema —
 * some combinations of FK hint + role + RLS reliably threw at the PostgREST
 * layer with a schema-cache error message, which then bubbled up to the
 * /qa/[slug] detail page as a generic "oops" via the error boundary.
 *
 * Two queries are ~20 ms slower than one joined query but completely
 * eliminate the hint-parsing failure mode, and the cost is irrelevant at
 * Phase 2 traffic levels.
 */
export async function getPublicPostById(id: string): Promise<PublicPostRow | null> {
  const supabase = await createClient();
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select(
      'id, board_slug, slug, title_ja, title_ko, excerpt_ja, excerpt_ko, body_ja, body_ko, cover_image_url, status, published_at, updated_at, created_at, author_id',
    )
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();
  if (postError) {
    console.error('[getPublicPostById] post query failed', { id, postError });
    throw postError;
  }
  if (!post) return null;

  const { data: authorRow, error: authorError } = await supabase
    .from('profiles')
    .select('nickname, role')
    .eq('id', (post as { author_id: string }).author_id)
    .maybeSingle();
  if (authorError) {
    console.error('[getPublicPostById] author query failed', {
      id,
      author_id: (post as { author_id: string }).author_id,
      authorError,
    });
    throw authorError;
  }
  if (!authorRow) return null;

  // Drop author_id from the public shape; the caller wants a nested
  // `author` object instead. Cast widened from the select shape.
  const { author_id: _authorId, ...rest } = post as AdminPostRow & { author_id: string };
  void _authorId;
  return {
    ...(rest as AdminPostRow),
    author: {
      nickname: authorRow.nickname,
      role: authorRow.role as PublicPostRow['author']['role'],
    },
  };
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
 * Published questions, newest first.
 *
 * Three sequential queries — posts → author profiles batch → answer
 * counts batch — instead of one PostgREST embedded query, for the same
 * reasons documented on `getPublicPostById` above. The batched follow-up
 * queries use `.in('id', ids)` so we still only hit Postgres three times
 * regardless of how many questions come back.
 */
export async function listPublishedQuestions(): Promise<QuestionListRow[]> {
  const supabase = await createClient();
  const { data: postRows, error: postError } = await supabase
    .from('posts')
    .select(
      'id, slug, title_ja, title_ko, excerpt_ja, excerpt_ko, published_at, created_at, author_id',
    )
    .eq('board_slug', 'qa')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(100);
  if (postError) {
    console.error('[listPublishedQuestions] post query failed', postError);
    throw postError;
  }

  const posts = (postRows ?? []) as Array<{
    id: string;
    slug: string;
    title_ja: string | null;
    title_ko: string | null;
    excerpt_ja: string | null;
    excerpt_ko: string | null;
    published_at: string | null;
    created_at: string;
    author_id: string;
  }>;
  if (posts.length === 0) return [];

  // Batch-fetch all referenced profiles and answer counts in parallel.
  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));
  const questionIds = posts.map((p) => p.id);

  const [profilesRes, answersRes] = await Promise.all([
    supabase.from('profiles').select('id, nickname, role').in('id', authorIds),
    supabase.from('answers').select('question_id').in('question_id', questionIds),
  ]);

  if (profilesRes.error) {
    console.error('[listPublishedQuestions] profiles batch failed', profilesRes.error);
    throw profilesRes.error;
  }
  if (answersRes.error) {
    console.error('[listPublishedQuestions] answers batch failed', answersRes.error);
    throw answersRes.error;
  }

  const profileById = new Map(
    (profilesRes.data ?? []).map((p) => [
      p.id as string,
      { nickname: p.nickname as string, role: p.role as UserRole },
    ]),
  );
  const answerCountById = new Map<string, number>();
  for (const row of answersRes.data ?? []) {
    const qId = (row as { question_id: string }).question_id;
    answerCountById.set(qId, (answerCountById.get(qId) ?? 0) + 1);
  }

  return posts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title_ja: p.title_ja,
    title_ko: p.title_ko,
    excerpt_ja: p.excerpt_ja,
    excerpt_ko: p.excerpt_ko,
    published_at: p.published_at,
    created_at: p.created_at,
    author: profileById.get(p.author_id) ?? { nickname: '???', role: 'member' as UserRole },
    answer_count: answerCountById.get(p.id) ?? 0,
  }));
}

/**
 * Single published question by slug. Two-step (post → author) for the
 * same reason as `getPublicPostById` — PostgREST's embed hint was flaky.
 * Returns null if not found or still a draft; RLS enforces the status
 * check but we double-filter here so a missing row renders as a clean
 * 404 instead of bubbling an RLS error up to the error boundary.
 */
export async function getQuestionBySlug(slug: string): Promise<QuestionDetailRow | null> {
  const supabase = await createClient();
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select(
      'id, board_slug, slug, title_ja, title_ko, excerpt_ja, excerpt_ko, body_ja, body_ko, cover_image_url, status, published_at, updated_at, created_at, author_id',
    )
    .eq('board_slug', 'qa')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (postError) {
    console.error('[getQuestionBySlug] post query failed', { slug, postError });
    throw postError;
  }
  if (!post) return null;

  const { data: authorRow, error: authorError } = await supabase
    .from('profiles')
    .select('nickname, role')
    .eq('id', (post as { author_id: string }).author_id)
    .maybeSingle();
  if (authorError) {
    console.error('[getQuestionBySlug] author query failed', {
      slug,
      author_id: (post as { author_id: string }).author_id,
      authorError,
    });
    throw authorError;
  }
  if (!authorRow) return null;

  const { author_id: _authorId, ...rest } = post as AdminPostRow & { author_id: string };
  void _authorId;
  return {
    ...(rest as AdminPostRow),
    author: {
      nickname: authorRow.nickname,
      role: authorRow.role as PublicPostRow['author']['role'],
    },
  };
}

/**
 * All answers for a question, **ordered by trust tier first** so the
 * admin / operator / verified reply rises to the top no matter when it
 * was written. Within a tier: highest helpful_count first, then oldest
 * created_at first so longstanding answers don't get buried under fresh
 * low-quality ones.
 *
 * PostgREST doesn't support computed column ordering directly, so we
 * sort client-side after the fetch. Cheap — Q&A threads are tiny.
 *
 * Two-step (answers → profiles batch) like the other Q&A queries to
 * avoid the embedded-FK hint syntax that was failing in production.
 */
export async function listAnswersForQuestion(questionId: string): Promise<AnswerRow[]> {
  const supabase = await createClient();
  const { data: answerRows, error: answersError } = await supabase
    .from('answers')
    .select('id, question_id, body_ja, body_ko, helpful_count, created_at, author_id')
    .eq('question_id', questionId);
  if (answersError) {
    console.error('[listAnswersForQuestion] answers query failed', { questionId, answersError });
    throw answersError;
  }

  const answers = (answerRows ?? []) as Array<{
    id: string;
    question_id: string;
    body_ja: JSONContent | null;
    body_ko: JSONContent | null;
    helpful_count: number;
    created_at: string;
    author_id: string;
  }>;
  if (answers.length === 0) return [];

  const authorIds = Array.from(new Set(answers.map((a) => a.author_id)));
  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, nickname, role')
    .in('id', authorIds);
  if (profileError) {
    console.error('[listAnswersForQuestion] profiles batch failed', profileError);
    throw profileError;
  }

  const profileById = new Map(
    (profileRows ?? []).map((p) => [
      p.id as string,
      { id: p.id as string, nickname: p.nickname as string, role: p.role as UserRole },
    ]),
  );

  const ROLE_RANK: Record<UserRole, number> = {
    admin: 0,
    operator: 1,
    verified: 2,
    member: 3,
  };

  const rows: AnswerRow[] = answers.map((a) => ({
    id: a.id,
    question_id: a.question_id,
    body_ja: a.body_ja,
    body_ko: a.body_ko,
    helpful_count: a.helpful_count,
    created_at: a.created_at,
    author: profileById.get(a.author_id) ?? {
      id: a.author_id,
      nickname: '???',
      role: 'member' as UserRole,
    },
  }));

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
