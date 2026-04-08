import Image from 'next/image';
import { PortableText, type PortableTextComponents } from '@portabletext/react';
import { urlFor } from '../../../sanity/lib/image';

// Custom renderers — keeps the page tied to our typography (font-hand for h2,
// muted-pink quote, etc.) and routes Sanity images through next/image.
const components: PortableTextComponents = {
  types: {
    image: ({ value }) => {
      if (!value?.asset) return null;
      const url = urlFor(value).width(1600).fit('max').url();
      return (
        <figure className="my-8">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md">
            <Image
              src={url}
              alt={value.alt ?? ''}
              fill
              sizes="(min-width: 768px) 720px, 100vw"
              className="object-cover"
            />
          </div>
          {value.alt ? (
            <figcaption className="mt-2 text-center text-xs text-zinc-500">{value.alt}</figcaption>
          ) : null}
        </figure>
      );
    },
  },
  block: {
    normal: ({ children }) => (
      <p className="mb-4 leading-relaxed text-zinc-700 dark:text-zinc-300">{children}</p>
    ),
    h2: ({ children }) => (
      <h2 className="font-hand mt-10 mb-4 text-2xl tracking-wide text-[var(--ink)]">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 mb-3 text-lg font-medium text-[var(--ink)]">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-4 border-[var(--accent)] bg-[var(--accent-soft)] py-3 pl-4 text-zinc-700 italic dark:text-zinc-300">
        {children}
      </blockquote>
    ),
  },
  marks: {
    link: ({ children, value }) => {
      const href = value?.href ?? '#';
      const external = href.startsWith('http');
      return (
        <a
          href={href}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="text-[var(--accent)] underline decoration-1 underline-offset-2 hover:opacity-80"
        >
          {children}
        </a>
      );
    },
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mb-4 ml-6 list-disc space-y-1 text-zinc-700 dark:text-zinc-300">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="mb-4 ml-6 list-decimal space-y-1 text-zinc-700 dark:text-zinc-300">
        {children}
      </ol>
    ),
  },
};

export function PortableTextRenderer({ value }: { value: unknown[] }) {
  // The Sanity-fetched portable text array is typed loosely as unknown[] in
  // our manual GROQ types. Cast at the boundary; @portabletext/react validates
  // structure at runtime.
  return (
    <PortableText
      value={value as Parameters<typeof PortableText>[0]['value']}
      components={components}
    />
  );
}
