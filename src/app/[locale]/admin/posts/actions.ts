'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { JSONContent } from '@tiptap/core';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { slugify, appendSuffix } from '@/lib/slug';
import { isTipTapEmpty } from '@/lib/tiptap/render';

/**
 * Server actions for the admin posts workflow. Every mutation:
 *   1. Calls `requireRole('operator')` first — operators and admins can
 *      write to pillar boards (life/study/trip); regular members only
 *      reach this via the RLS insert policy for member-writable boards,
 *      not via this admin route.
 *   2. Uses the regular cookie-authed Supabase client so RLS applies
 *      normally. No service-role key path here.
 *   3. Invalidates the relevant layout cache after the DB write so the
 *      admin list + header nickname pill both refresh on navigation.
 */

// Safely parse a TipTap JSON body submitted via a hidden <input name="...">.
// Returns null for empty / malformed input so the caller can persist NULL
// rather than "{}".
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

function pickTitle(formData: FormData, lang: 'ja' | 'ko'): string | null {
  const v = String(formData.get(`title_${lang}`) ?? '').trim();
  return v || null;
}

function pickExcerpt(formData: FormData, lang: 'ja' | 'ko'): string | null {
  const v = String(formData.get(`excerpt_${lang}`) ?? '').trim();
  return v || null;
}

function pickCoverUrl(formData: FormData): string | null {
  const raw = String(formData.get('cover_image_url') ?? '').trim();
  if (!raw) return null;
  // Minimal sanity check so a broken form submission can't poison the
  // column with arbitrary text. We only accept http(s) URLs — Supabase
  // Storage returns https, and a relative path would never resolve
  // against a foreign domain in an OG card anyway.
  if (!/^https?:\/\//i.test(raw)) return null;
  return raw;
}

const MAX_SLUG_RETRIES = 5;

/**
 * Create a new draft post. Redirects to the edit page on success so the
 * author can keep iterating before publishing.
 */
export async function createPost(formData: FormData) {
  const user = await requireRole('operator');

  const boardSlug = String(formData.get('board_slug') ?? '').trim();
  if (!boardSlug) return { ok: false as const, error: 'board-required' };

  const titleJa = pickTitle(formData, 'ja');
  const titleKo = pickTitle(formData, 'ko');
  if (!titleJa && !titleKo) return { ok: false as const, error: 'title-required' };

  const bodyJa = parseTipTapBody(formData.get('body_ja'));
  const bodyKo = parseTipTapBody(formData.get('body_ko'));
  if (!bodyJa && !bodyKo) return { ok: false as const, error: 'body-required' };

  const excerptJa = pickExcerpt(formData, 'ja');
  const excerptKo = pickExcerpt(formData, 'ko');
  const coverImageUrl = pickCoverUrl(formData);

  const baseSlug = slugify(titleJa ?? titleKo ?? '');

  const supabase = await createClient();
  let slug = baseSlug;
  let attempt = 1;
  let lastError: string | null = null;
  let createdId: string | null = null;

  // Retry a small number of times on unique-violation to auto-disambiguate
  // slugs inside the same board. Cap the retries so a malformed trigger
  // can't put us in an infinite loop.
  while (attempt <= MAX_SLUG_RETRIES) {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        board_slug: boardSlug,
        author_id: user.id,
        slug,
        title_ja: titleJa,
        title_ko: titleKo,
        excerpt_ja: excerptJa,
        excerpt_ko: excerptKo,
        body_ja: bodyJa,
        body_ko: bodyKo,
        cover_image_url: coverImageUrl,
        status: 'draft',
      })
      .select('id')
      .single();

    if (!error && data) {
      createdId = data.id;
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

  if (!createdId) {
    return { ok: false as const, error: lastError ?? 'slug-collision' };
  }

  revalidatePath('/admin/posts', 'layout');
  redirect(`/admin/posts/${createdId}`);
}

/**
 * Update an existing post. Operators can edit their own drafts freely;
 * admins can edit anyone's (enforced by RLS).
 */
export async function updatePost(id: string, formData: FormData) {
  await requireRole('operator');

  const titleJa = pickTitle(formData, 'ja');
  const titleKo = pickTitle(formData, 'ko');
  const excerptJa = pickExcerpt(formData, 'ja');
  const excerptKo = pickExcerpt(formData, 'ko');
  const bodyJa = parseTipTapBody(formData.get('body_ja'));
  const bodyKo = parseTipTapBody(formData.get('body_ko'));
  const coverImageUrl = pickCoverUrl(formData);

  const supabase = await createClient();
  const { error } = await supabase
    .from('posts')
    .update({
      title_ja: titleJa,
      title_ko: titleKo,
      excerpt_ja: excerptJa,
      excerpt_ko: excerptKo,
      body_ja: bodyJa,
      body_ko: bodyKo,
      cover_image_url: coverImageUrl,
    })
    .eq('id', id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/admin/posts', 'layout');
  revalidatePath(`/admin/posts/${id}`, 'layout');
  return { ok: true as const };
}

/**
 * Flip a draft to `published` and stamp `published_at`. Pillar board posts
 * skip the `pending` moderation step because only operators/admins can
 * insert into those boards in the first place; member-writable boards
 * (Phase 2-D) will use `pending` instead.
 */
export async function publishPost(id: string) {
  await requireRole('operator');

  const supabase = await createClient();
  const { error } = await supabase
    .from('posts')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/admin/posts', 'layout');
  revalidatePath(`/admin/posts/${id}`, 'layout');
  revalidatePath(`/p/${id}`, 'layout');
  return { ok: true as const };
}

/**
 * Revert a published post back to draft. Used as a soft-unpublish until
 * we have a proper "unpublished" vs "rejected" distinction.
 */
export async function unpublishPost(id: string) {
  await requireRole('operator');

  const supabase = await createClient();
  const { error } = await supabase
    .from('posts')
    .update({ status: 'draft', published_at: null })
    .eq('id', id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/admin/posts', 'layout');
  revalidatePath(`/admin/posts/${id}`, 'layout');
  return { ok: true as const };
}

/**
 * Hard delete. Only the author (enforced by RLS via posts_update_own)
 * and admins can delete. Cascades through to post_revisions via FK.
 */
export async function deletePost(id: string) {
  await requireRole('operator');

  const supabase = await createClient();
  const { error } = await supabase.from('posts').delete().eq('id', id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/admin/posts', 'layout');
  redirect('/admin/posts');
}
