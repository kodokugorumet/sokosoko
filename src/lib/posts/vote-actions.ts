'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/require-role';
import { createNotification } from '@/lib/notifications/actions';

/**
 * Toggle a helpful vote on a Q&A answer.
 *
 * - If the user hasn't voted yet: INSERT into `answer_votes` + increment
 *   `answers.helpful_count`.
 * - If the user already voted: DELETE from `answer_votes` + decrement
 *   `answers.helpful_count`.
 *
 * The count is denormalised for sort performance. We update it in the
 * same server action (not a trigger) because RLS + trigger interactions
 * can be tricky on the Supabase Free tier. The `answer_votes` PK
 * (answer_id, user_id) ensures uniqueness.
 *
 * Returns `{ voted: boolean, newCount: number }` so the client can
 * update its UI optimistically.
 */
export async function toggleHelpfulVote(answerId: string, questionSlug: string) {
  const user = await getSessionUser();
  if (!user || !user.onboarded) {
    return { ok: false as const, error: 'unauthorized' };
  }

  const supabase = await createClient();

  // Check if the user already voted.
  const { data: existing } = await supabase
    .from('answer_votes')
    .select('answer_id')
    .eq('answer_id', answerId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    // Un-vote: delete the vote row + decrement count.
    await supabase.from('answer_votes').delete().eq('answer_id', answerId).eq('user_id', user.id);

    // Decrement (floor at 0 to be safe).
    const { data: answer } = await supabase
      .from('answers')
      .select('helpful_count')
      .eq('id', answerId)
      .single();
    const newCount = Math.max(0, (answer?.helpful_count ?? 1) - 1);
    await supabase.from('answers').update({ helpful_count: newCount }).eq('id', answerId);

    revalidatePath(`/qa/${questionSlug}`, 'layout');
    return { ok: true as const, voted: false, newCount };
  } else {
    // Vote: insert the vote row + increment count.
    const { error: insertError } = await supabase
      .from('answer_votes')
      .insert({ answer_id: answerId, user_id: user.id });

    if (insertError) {
      // Unique violation = race condition (double-click). Treat as
      // already voted rather than erroring.
      if (insertError.code === '23505') {
        return { ok: true as const, voted: true, newCount: -1 };
      }
      return { ok: false as const, error: insertError.message };
    }

    const { data: answer } = await supabase
      .from('answers')
      .select('helpful_count, author_id, question_id')
      .eq('id', answerId)
      .single();
    const newCount = (answer?.helpful_count ?? 0) + 1;
    await supabase.from('answers').update({ helpful_count: newCount }).eq('id', answerId);

    // Notify the answer author that someone found their answer helpful.
    if (answer?.author_id && answer.author_id !== user.id) {
      createNotification({
        recipientId: answer.author_id as string,
        kind: 'helpful_vote',
        sourceId: answerId,
        actorId: user.id,
        postId: (answer.question_id as string) ?? null,
      }).catch(() => {});
    }

    revalidatePath(`/qa/${questionSlug}`, 'layout');
    return { ok: true as const, voted: true, newCount };
  }
}

/**
 * Check if the current user has voted on a set of answer IDs. Used by
 * the Q&A detail page to render the initial button state without
 * a per-answer query.
 */
export async function getMyVotes(answerIds: string[]): Promise<Set<string>> {
  const user = await getSessionUser();
  if (!user) return new Set();

  const supabase = await createClient();
  const { data } = await supabase
    .from('answer_votes')
    .select('answer_id')
    .in('answer_id', answerIds)
    .eq('user_id', user.id);

  return new Set((data ?? []).map((r) => (r as { answer_id: string }).answer_id));
}
