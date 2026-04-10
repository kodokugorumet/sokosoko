'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { JSONContent } from '@tiptap/core';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/require-role';
import { isTipTapEmpty } from '@/lib/tiptap/render';

/**
 * Delete a community post. RLS enforces the author-check
 * (posts_delete_own_community) or admin override (posts_admin_delete),
 * so we don't need an explicit role check beyond auth.
 */
export async function deleteCommunityPost(postId: string, boardSlug: string) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase.from('posts').delete().eq('id', postId);

  if (error) {
    console.error('[deleteCommunityPost] failed', { postId, error });
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/community/${boardSlug}`, 'layout');
  redirect(`/community/${boardSlug}`);
}

/**
 * Update a community post's title and body. RLS enforces ownership.
 */
export async function updateCommunityPost(postId: string, boardSlug: string, formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const titleJa = String(formData.get('title_ja') ?? '').trim() || null;
  const titleKo = String(formData.get('title_ko') ?? '').trim() || null;
  if (!titleJa && !titleKo) return { ok: false as const, error: 'title-required' };

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

  const bodyJa = parseTipTapBody(formData.get('body_ja'));
  const bodyKo = parseTipTapBody(formData.get('body_ko'));

  const supabase = await createClient();
  const { error } = await supabase
    .from('posts')
    .update({
      title_ja: titleJa,
      title_ko: titleKo,
      body_ja: bodyJa,
      body_ko: bodyKo,
    })
    .eq('id', postId);

  if (error) {
    console.error('[updateCommunityPost] failed', { postId, error });
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/community/${boardSlug}`, 'layout');
  return { ok: true as const };
}
