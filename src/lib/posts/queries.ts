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

/**
 * List view shape that carries enough author context for the admin
 * list page to show "by @other-operator" next to each row.
 */
export type AdminPostListRow = PostListRow & {
  author: {
    id: string;
    nickname: string;
    role: UserRole;
  };
};

/** All posts authored by a given user, newest first. */
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

/**
 * Team-wide post list for the admin dashboard. Used when the caller is
 * admin or operator and should see everyone's drafts + published posts
 * across every article board. Returns the same shape as the per-author
 * query plus the author's nickname + role so the list can show a "by
 * @someone" column without a second lookup on the client.
 *
 * Two-step (posts → profiles batch) to avoid PostgREST embedded FK
 * flakiness, same as the other reader queries.
 */
export async function listAllAdminPosts(): Promise<AdminPostListRow[]> {
  const supabase = await createClient();
  const { data: postRows, error: postsError } = await supabase
    .from('posts')
    .select('id, board_slug, slug, title_ja, title_ko, status, published_at, updated_at, author_id')
    .order('updated_at', { ascending: false })
    .limit(200);
  if (postsError) {
    console.error('[listAllAdminPosts] posts query failed', postsError);
    throw postsError;
  }

  const rows = (postRows ?? []) as Array<{
    id: string;
    board_slug: string;
    slug: string;
    title_ja: string | null;
    title_ko: string | null;
    status: PostStatus;
    published_at: string | null;
    updated_at: string;
    author_id: string;
  }>;
  if (rows.length === 0) return [];

  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, nickname, role')
    .in('id', authorIds);
  if (profileError) {
    console.error('[listAllAdminPosts] profiles batch failed', profileError);
    throw profileError;
  }

  const profileById = new Map(
    (profileRows ?? []).map((p) => [
      p.id as string,
      {
        id: p.id as string,
        nickname: p.nickname as string,
        role: p.role as UserRole,
      },
    ]),
  );

  return rows.map((r) => ({
    id: r.id,
    board_slug: r.board_slug,
    slug: r.slug,
    title_ja: r.title_ja,
    title_ko: r.title_ko,
    status: r.status,
    published_at: r.published_at,
    updated_at: r.updated_at,
    author: profileById.get(r.author_id) ?? {
      id: r.author_id,
      nickname: '???',
      role: 'member' as UserRole,
    },
  }));
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

  // Build the public shape explicitly. `author_id` is in the select
  // projection (we need it to look up the profile) but not in the
  // returned type; the cleanest way to strip it is to list the fields
  // we actually want instead of fighting TypeScript's destructuring.
  const p = post as AdminPostRow & { author_id: string };
  return {
    id: p.id,
    board_slug: p.board_slug,
    slug: p.slug,
    title_ja: p.title_ja,
    title_ko: p.title_ko,
    excerpt_ja: p.excerpt_ja,
    excerpt_ko: p.excerpt_ko,
    body_ja: p.body_ja,
    body_ko: p.body_ko,
    cover_image_url: p.cover_image_url,
    status: p.status,
    published_at: p.published_at,
    updated_at: p.updated_at,
    created_at: p.created_at,
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
// Public article board helpers — life/study/trip and any future article
// board uses these. Q&A (`kind='qa'`) has its own helpers below because
// the reader chrome is different (question list vs card grid).
// ---------------------------------------------------------------------------

/** List card — lighter payload for the board index grid. */
export type PublicPostCardRow = {
  id: string;
  board_slug: string;
  slug: string;
  title_ja: string | null;
  title_ko: string | null;
  excerpt_ja: string | null;
  excerpt_ko: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
  author: {
    nickname: string;
    role: UserRole;
  };
};

/**
 * All published posts for a given article board, newest first. Two-step
 * (posts → profiles batch) for the same reason every other public query
 * in this file is — see `getPublicPostById` for the backstory.
 */
export async function listPublishedPostsByBoard(boardSlug: string): Promise<PublicPostCardRow[]> {
  const supabase = await createClient();
  const { data: postRows, error: postsError } = await supabase
    .from('posts')
    .select(
      'id, board_slug, slug, title_ja, title_ko, excerpt_ja, excerpt_ko, cover_image_url, published_at, created_at, author_id',
    )
    .eq('board_slug', boardSlug)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(100);
  if (postsError) {
    console.error('[listPublishedPostsByBoard] posts query failed', { boardSlug, postsError });
    throw postsError;
  }

  const posts = (postRows ?? []) as Array<{
    id: string;
    board_slug: string;
    slug: string;
    title_ja: string | null;
    title_ko: string | null;
    excerpt_ja: string | null;
    excerpt_ko: string | null;
    cover_image_url: string | null;
    published_at: string | null;
    created_at: string;
    author_id: string;
  }>;
  if (posts.length === 0) return [];

  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));
  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, nickname, role')
    .in('id', authorIds);
  if (profileError) {
    console.error('[listPublishedPostsByBoard] profiles batch failed', profileError);
    throw profileError;
  }

  const profileById = new Map(
    (profileRows ?? []).map((p) => [
      p.id as string,
      { nickname: p.nickname as string, role: p.role as UserRole },
    ]),
  );

  return posts.map((p) => ({
    id: p.id,
    board_slug: p.board_slug,
    slug: p.slug,
    title_ja: p.title_ja,
    title_ko: p.title_ko,
    excerpt_ja: p.excerpt_ja,
    excerpt_ko: p.excerpt_ko,
    cover_image_url: p.cover_image_url,
    published_at: p.published_at,
    created_at: p.created_at,
    author: profileById.get(p.author_id) ?? { nickname: '???', role: 'member' as UserRole },
  }));
}

/**
 * Latest published posts grouped by board slug — one query, then
 * client-side grouping. Used by the home page's 3-pillar grid. Pulls
 * more rows than strictly needed and trims per board so we don't do
 * three separate round-trips.
 */
export async function listLatestPerBoard(
  boardSlugs: string[],
  perBoard: number,
): Promise<Record<string, PublicPostCardRow[]>> {
  const supabase = await createClient();
  const { data: postRows, error: postsError } = await supabase
    .from('posts')
    .select(
      'id, board_slug, slug, title_ja, title_ko, excerpt_ja, excerpt_ko, cover_image_url, published_at, created_at, author_id',
    )
    .in('board_slug', boardSlugs)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    // Over-fetch so each board has a fair shot even when one board
    // dominates recent publishing.
    .limit(boardSlugs.length * perBoard * 4);
  if (postsError) {
    console.error('[listLatestPerBoard] posts query failed', { boardSlugs, postsError });
    throw postsError;
  }

  const posts = (postRows ?? []) as Array<{
    id: string;
    board_slug: string;
    slug: string;
    title_ja: string | null;
    title_ko: string | null;
    excerpt_ja: string | null;
    excerpt_ko: string | null;
    cover_image_url: string | null;
    published_at: string | null;
    created_at: string;
    author_id: string;
  }>;

  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));
  let profileById: Map<string, { nickname: string; role: UserRole }> = new Map();
  if (authorIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('id, nickname, role')
      .in('id', authorIds);
    if (profileError) {
      console.error('[listLatestPerBoard] profiles batch failed', profileError);
      throw profileError;
    }
    profileById = new Map(
      (profileRows ?? []).map((p) => [
        p.id as string,
        { nickname: p.nickname as string, role: p.role as UserRole },
      ]),
    );
  }

  // Initialise every requested board with an empty array so callers can
  // rely on every key being present regardless of data.
  const grouped: Record<string, PublicPostCardRow[]> = {};
  for (const slug of boardSlugs) grouped[slug] = [];

  for (const p of posts) {
    const bucket = grouped[p.board_slug];
    if (!bucket || bucket.length >= perBoard) continue;
    bucket.push({
      id: p.id,
      board_slug: p.board_slug,
      slug: p.slug,
      title_ja: p.title_ja,
      title_ko: p.title_ko,
      excerpt_ja: p.excerpt_ja,
      excerpt_ko: p.excerpt_ko,
      cover_image_url: p.cover_image_url,
      published_at: p.published_at,
      created_at: p.created_at,
      author: profileById.get(p.author_id) ?? { nickname: '???', role: 'member' as UserRole },
    });
  }

  return grouped;
}

/**
 * Public board + slug detail query. Used by `/[board]/[slug]` pages.
 * Same two-step pattern as `getPublicPostById` but keyed by the
 * (board_slug, slug) unique index so URLs stay stable across content
 * lifecycle (unlike UUID-based URLs which expose the internal id).
 *
 * Handles the NFC / decodeURIComponent issue the Q&A slug lookup ran
 * into: Next.js 16 hands `params.slug` to Server Components exactly as
 * it appears in the URL, so non-ASCII slugs need decoding first.
 */
export async function getPublicPostByBoardSlug(
  boardSlug: string,
  slug: string,
): Promise<PublicPostRow | null> {
  const supabase = await createClient();

  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    /* malformed — use raw, will likely 404 */
  }

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select(
      'id, board_slug, slug, title_ja, title_ko, excerpt_ja, excerpt_ko, body_ja, body_ko, cover_image_url, status, published_at, updated_at, created_at, author_id',
    )
    .eq('board_slug', boardSlug)
    .eq('slug', decoded)
    .eq('status', 'published')
    .maybeSingle();
  if (postError) {
    console.error('[getPublicPostByBoardSlug] post query failed', {
      boardSlug,
      slug,
      decoded,
      postError,
    });
    throw postError;
  }
  if (!post) return null;

  const { data: authorRow, error: authorError } = await supabase
    .from('profiles')
    .select('nickname, role')
    .eq('id', (post as { author_id: string }).author_id)
    .maybeSingle();
  if (authorError) {
    console.error('[getPublicPostByBoardSlug] author query failed', authorError);
    throw authorError;
  }
  if (!authorRow) return null;

  const p = post as AdminPostRow & { author_id: string };
  return {
    id: p.id,
    board_slug: p.board_slug,
    slug: p.slug,
    title_ja: p.title_ja,
    title_ko: p.title_ko,
    excerpt_ja: p.excerpt_ja,
    excerpt_ko: p.excerpt_ko,
    body_ja: p.body_ja,
    body_ko: p.body_ko,
    cover_image_url: p.cover_image_url,
    status: p.status,
    published_at: p.published_at,
    updated_at: p.updated_at,
    created_at: p.created_at,
    author: {
      nickname: authorRow.nickname,
      role: authorRow.role as PublicPostRow['author']['role'],
    },
  };
}

/**
 * Every (board_slug, slug) pair for published posts — used by sitemap
 * generation and static param generation. Cheap: one indexed query,
 * no joins.
 */
export type PublicPostSlug = {
  board_slug: string;
  slug: string;
  updated_at: string;
};

export async function listAllPublishedPostSlugs(): Promise<PublicPostSlug[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('board_slug, slug, updated_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (error) {
    console.error('[listAllPublishedPostSlugs] query failed', error);
    throw error;
  }
  return (data ?? []) as PublicPostSlug[];
}

/**
 * Full-text search across published posts for the /search page. Matches
 * the title and excerpt fields in both locales, ordered by most recent.
 * GROQ's `match` used to handle this in the Sanity era; Postgres `ilike`
 * with a multi-column `or` is the direct equivalent.
 */
export async function searchPublishedPosts(query: string): Promise<PublicPostCardRow[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const supabase = await createClient();
  const like = `%${trimmed.replace(/[%_]/g, (c) => `\\${c}`)}%`;
  const { data: postRows, error: postsError } = await supabase
    .from('posts')
    .select(
      'id, board_slug, slug, title_ja, title_ko, excerpt_ja, excerpt_ko, cover_image_url, published_at, created_at, author_id',
    )
    .eq('status', 'published')
    .neq('board_slug', 'qa') // Q&A has its own search
    .or(
      `title_ja.ilike.${like},title_ko.ilike.${like},excerpt_ja.ilike.${like},excerpt_ko.ilike.${like}`,
    )
    .order('published_at', { ascending: false })
    .limit(50);
  if (postsError) {
    console.error('[searchPublishedPosts] posts query failed', postsError);
    throw postsError;
  }

  const posts = (postRows ?? []) as Array<{
    id: string;
    board_slug: string;
    slug: string;
    title_ja: string | null;
    title_ko: string | null;
    excerpt_ja: string | null;
    excerpt_ko: string | null;
    cover_image_url: string | null;
    published_at: string | null;
    created_at: string;
    author_id: string;
  }>;
  if (posts.length === 0) return [];

  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));
  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, nickname, role')
    .in('id', authorIds);
  if (profileError) {
    console.error('[searchPublishedPosts] profiles batch failed', profileError);
    throw profileError;
  }

  const profileById = new Map(
    (profileRows ?? []).map((p) => [
      p.id as string,
      { nickname: p.nickname as string, role: p.role as UserRole },
    ]),
  );

  return posts.map((p) => ({
    id: p.id,
    board_slug: p.board_slug,
    slug: p.slug,
    title_ja: p.title_ja,
    title_ko: p.title_ko,
    excerpt_ja: p.excerpt_ja,
    excerpt_ko: p.excerpt_ko,
    cover_image_url: p.cover_image_url,
    published_at: p.published_at,
    created_at: p.created_at,
    author: profileById.get(p.author_id) ?? { nickname: '???', role: 'member' as UserRole },
  }));
}

/**
 * Full-text search across published Q&A questions. Separate from
 * `searchPublishedPosts` because the reader UI groups posts and
 * questions into distinct sections of the results page.
 */
export async function searchPublishedQuestions(query: string): Promise<QuestionListRow[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const supabase = await createClient();
  const like = `%${trimmed.replace(/[%_]/g, (c) => `\\${c}`)}%`;
  const { data: postRows, error: postsError } = await supabase
    .from('posts')
    .select(
      'id, slug, title_ja, title_ko, excerpt_ja, excerpt_ko, published_at, created_at, author_id',
    )
    .eq('board_slug', 'qa')
    .eq('status', 'published')
    .or(
      `title_ja.ilike.${like},title_ko.ilike.${like},excerpt_ja.ilike.${like},excerpt_ko.ilike.${like}`,
    )
    .order('published_at', { ascending: false })
    .limit(50);
  if (postsError) {
    console.error('[searchPublishedQuestions] posts query failed', postsError);
    throw postsError;
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

  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));
  const questionIds = posts.map((p) => p.id);

  const [profilesRes, answersRes] = await Promise.all([
    supabase.from('profiles').select('id, nickname, role').in('id', authorIds),
    supabase.from('answers').select('question_id').in('question_id', questionIds),
  ]);

  if (profilesRes.error) {
    console.error('[searchPublishedQuestions] profiles batch failed', profilesRes.error);
    throw profilesRes.error;
  }
  if (answersRes.error) {
    console.error('[searchPublishedQuestions] answers batch failed', answersRes.error);
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
 * Single published question by slug. Two-step (post → author) to avoid
 * PostgREST's flaky embed hint syntax — see the sibling `getPublicPostById`
 * for the full explanation.
 *
 * The slug coming in from `params.slug` is the raw URL path segment,
 * which Next.js 16 App Router does **not** auto-decode. Our stored slugs
 * can contain CJK characters (see `slugify()` in `src/lib/slug.ts`), so
 * we always run `decodeURIComponent` before the lookup. Earlier revs of
 * this function tried NFC/NFD variants and a full-table fallback scan
 * too, but the diagnostic logging added in #56 confirmed that
 * `decodeURIComponent` alone is enough — no normalisation or fallback
 * needed. See PR #58 for the log line that pinned it down.
 */
export async function getQuestionBySlug(slug: string): Promise<QuestionDetailRow | null> {
  const supabase = await createClient();

  // decodeURIComponent can throw on malformed escapes; fall back to the
  // raw string so a hand-crafted URL still reaches a deterministic 404
  // instead of bubbling a TypeError up to the error boundary.
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    /* malformed percent-encoding — use raw, will likely 404 */
  }

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select(
      'id, board_slug, slug, title_ja, title_ko, excerpt_ja, excerpt_ko, body_ja, body_ko, cover_image_url, status, published_at, updated_at, created_at, author_id',
    )
    .eq('board_slug', 'qa')
    .eq('slug', decoded)
    .eq('status', 'published')
    .maybeSingle();
  if (postError) {
    console.error('[getQuestionBySlug] post query failed', { slug, decoded, postError });
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

  const p = post as AdminPostRow & { author_id: string };
  return {
    id: p.id,
    board_slug: p.board_slug,
    slug: p.slug,
    title_ja: p.title_ja,
    title_ko: p.title_ko,
    excerpt_ja: p.excerpt_ja,
    excerpt_ko: p.excerpt_ko,
    body_ja: p.body_ja,
    body_ko: p.body_ko,
    cover_image_url: p.cover_image_url,
    status: p.status,
    published_at: p.published_at,
    updated_at: p.updated_at,
    created_at: p.created_at,
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
