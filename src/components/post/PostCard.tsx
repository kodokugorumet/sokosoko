import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { urlFor } from '../../../sanity/lib/image';
import type { PostCard as PostCardType } from '../../../sanity/lib/queries';

const TIER_BADGE: Record<string, string> = {
  crown: '👑',
  apple: '🍎',
  contributor: '✏️',
};

type Locale = 'ja' | 'ko';

function pickLocaleString(value: { ja?: string; ko?: string } | undefined, locale: Locale) {
  if (!value) return '';
  return value[locale] ?? value[locale === 'ja' ? 'ko' : 'ja'] ?? '';
}

function formatDate(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function PostCard({ post, locale }: { post: PostCardType; locale: Locale }) {
  const title = pickLocaleString(post.title, locale);
  const excerpt = pickLocaleString(post.excerpt, locale);
  const authorName = pickLocaleString(post.author.name, locale);
  const tierBadge = TIER_BADGE[post.author.tier] ?? '';
  const href = `/${post.category.pillar}/${post.slug}`;

  return (
    <Link
      href={href}
      className="hand-box group flex flex-col overflow-hidden rounded-md transition-colors hover:bg-[var(--accent-soft)]"
    >
      {post.coverImage ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <Image
            src={urlFor(post.coverImage).width(800).height(500).fit('crop').url()}
            alt={title}
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      ) : (
        // No cover — fall back to a soft pastel block so the grid stays even.
        <div
          aria-hidden="true"
          className="flex aspect-[16/10] w-full items-center justify-center bg-[var(--accent-soft)] text-4xl"
        >
          {tierBadge || '✏️'}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="line-clamp-2 text-base font-medium tracking-tight text-[var(--ink)]">
          {title}
        </h3>
        {excerpt ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {excerpt}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between pt-3 text-xs text-zinc-500">
          <span>
            {tierBadge} {authorName}
          </span>
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
        </div>
      </div>
    </Link>
  );
}
