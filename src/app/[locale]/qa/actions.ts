'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { JSONContent } from '@tiptap/core';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/require-role';
import { slugify, appendSuffix } from '@/lib/slug';
import { isTipTapEmpty } from '@/lib/tiptap/render';

/**
 * Q&A server actions. Questions live in `posts` with `board_slug='qa'`;
 * answers live in the separate `answers` table. Unlike admin posts, any
 * onboarded member can create questions and answers — gating is done by
 * `requireOnboardedMember()` below, which is a lighter version of
 * `requireRole('operator')`.
 *
 * Publishing model: questions are created directly as `status='published'`
 * (no draft/pending step for now) so readers see them immediately. We may
 * revisit this when spam becomes a real problem — at that point swap the
 * insert to `status='pending'` and build a moderation queue.
 */

async function requireOnboardedMember() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!user.onboarded) redirect('/onboarding');
  return user;
}

function parseTipTapBody(raw: FormDataEntryValue | null): JSONContent | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as JSONContent;
    if (isTipTapEmpty(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function pickText(formData: FormData, name: string): string | null {
  const v = String(formData.get(name) ?? '').trim();
  return v || null;
}

const MAX_SLUG_RETRIES = 5;

export async function createQuestion(formData: FormData) {
  const user = await requireOnboardedMember();

  const titleJa = pickText(formData, 'title_ja');
  const titleKo = pickText(formData, 'title_ko');
  if (!titleJa && !titleKo) return { ok: false as const, error: 'title-required' };

  const bodyJa = parseTipTapBody(formData.get('body_ja'));
  const bodyKo = parseTipTapBody(formData.get('body_ko'));
  // Body is optional for questions — a short question is often better as
  // title-only. We still require at least ONE of title+body to be non-empty
  // which the title check above guarantees.

  const baseSlug = slugify(titleJa ?? titleKo ?? '');

  const supabase = await createClient();
  let slug = baseSlug;
  let attempt = 1;
  let lastError: string | null = null;
  let createdSlug: string | null = null;

  while (attempt <= MAX_SLUG_RETRIES) {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        board_slug: 'qa',
        author_id: user.id,
        slug,
        title_ja: titleJa,
        title_ko: titleKo,
        body_ja: bodyJa,
        body_ko: bodyKo,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .select('slug')
      .single();

    if (!error && data) {
      createdSlug = data.slug;
      break;
    }
    if (error?.code === '23505') {
      attempt += 1;
      slug = appendSuffix(baseSlug, attempt);
      continue;
    }
    lastError = error?.message ?? 'unknown';
    break;
  }

  if (!createdSlug) {
    return { ok: false as const, error: lastError ?? 'slug-collision' };
  }

  revalidatePath('/qa', 'layout');
  redirect(`/qa/${createdSlug}`);
}

/**
 * Post an answer to a question. Gated on onboarded membership — no role
 * check beyond that, because the Q&A is where `verified` tier gets earned
 * in the first place.
 */
export async function createAnswer(questionId: string, formData: FormData) {
  const user = await requireOnboardedMember();

  const bodyJa = parseTipTapBody(formData.get('body_ja'));
  const bodyKo = parseTipTapBody(formData.get('body_ko'));
  if (!bodyJa && !bodyKo) return { ok: false as const, error: 'body-required' };

  const supabase = await createClient();
  const { error } = await supabase.from('answers').insert({
    question_id: questionId,
    author_id: user.id,
    body_ja: bodyJa,
    body_ko: bodyKo,
  });

  if (error) return { ok: false as const, error: error.message };

  // Invalidate the question detail page so the new answer shows up on
  // the next navigation without a hard refresh.
  revalidatePath(`/qa/[slug]`, 'page');
  return { ok: true as const };
}

/**
 * Delete an own answer. RLS enforces `author_id = auth.uid()` but we
 * also let admin/operator delete any answer for moderation. That moderation
 * path is not yet surfaced in the UI — Phase 2-E.
 */
export async function deleteAnswer(answerId: string, questionSlug: string) {
  await requireOnboardedMember();

  const supabase = await createClient();
  const { error } = await supabase.from('answers').delete().eq('id', answerId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/qa/${questionSlug}`, 'layout');
  return { ok: true as const };
}

// Question deletion intentionally omitted for Phase 2-D. The current
// migration (0001_init.sql) doesn't have a DELETE policy on `posts`,
// so a bare `.delete()` would be blocked by RLS for every caller. Phase
// 2-E adds the moderation surface (admin/operator delete + author
// self-delete) along with the matching policy in a new migration.
