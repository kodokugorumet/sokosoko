import { permanentRedirect, notFound } from 'next/navigation';
import { getPublicPostById } from '@/lib/posts/queries';
import { isSupabaseConfigured } from '@/lib/supabase/server';

type Params = { locale: string; id: string };

/**
 * Legacy URL shim. `/p/[id]` was the interim post detail route used in
 * Phase 2-C (Supabase posts but no pretty URLs yet). Phase 2-F moves
 * every post to `/[board]/[slug]`, so this route now does a 308
 * permanent redirect to the new canonical URL instead of rendering.
 *
 * Kept around (rather than deleted) because any link that went out
 * during the few days of Phase 2-C will still hit this path, and a
 * 308 lets Google / Bing update their index cleanly.
 */
export default async function LegacyPostRedirect({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) notFound();

  const post = await getPublicPostById(id).catch(() => null);
  if (!post) notFound();

  permanentRedirect(`/${post.board_slug}/${encodeURIComponent(post.slug)}`);
}
