'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { JSONContent } from '@tiptap/core';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/require-role';
import { slugify, appendSuffix } from '@/lib/slug';
import { isTipTapEmpty } from '@/lib/tiptap/render';

/**
 * Server action: create a post in a community board. Open to any
 * onboarded member — the RLS policy `posts_insert_allowed_boards`
 * checks `boards.allow_member_post=true` so a spoofed form body
 * targeting an operator-only pillar board would be blocked at the
 * DB level anyway.
 *
 * Posts are created directly as `status='published'` with no draft
 * step — community boards skip the draft/publish workflow for now.
 * If spam becomes a problem, flip this to `status='pending'` and
 * surface the moderation queue.
 */

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

export async function createCommunityPost(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!user.onboarded) redirect('/onboarding');

  const boardSlug = String(formData.get('board_slug') ?? '').trim();
  if (!boardSlug) return { ok: false as const, error: 'board-required' };

  const titleJa = pickText(formData, 'title_ja');
  const titleKo = pickText(formData, 'title_ko');
  if (!titleJa && !titleKo) return { ok: false as const, error: 'title-required' };

  const bodyJa = parseTipTapBody(formData.get('body_ja'));
  const bodyKo = parseTipTapBody(formData.get('body_ko'));

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
        board_slug: boardSlug,
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

  revalidatePath(`/community/${boardSlug}`, 'layout');
  // percent-encode for the x-action-redirect header (see #54)
  redirect(`/community/${boardSlug}/${encodeURIComponent(createdSlug)}`);
}
