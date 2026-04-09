'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { useEffect, useMemo } from 'react';
import type { JSONContent } from '@tiptap/core';

// NOTE: starting with @tiptap/starter-kit v3 the Link extension ships
// inside StarterKit by default, so importing `@tiptap/extension-link`
// here AND adding it to the extensions array (the way the v2 docs still
// recommend) registers `link` twice and TipTap warns:
//   "Duplicate extension names found: ['link']."
// We keep the same Link configuration but route it through StarterKit's
// `link` option below instead of as a standalone extension.

/**
 * Thin wrapper around @tiptap/react that matches the site's hand-drawn
 * aesthetic (see globals.css `.hand-box`, `--accent`) and supports:
 *  - Bold / italic via StarterKit
 *  - H2 / H3 (H1 is reserved for the page title, not the body)
 *  - Bullet + ordered lists
 *  - Blockquote, horizontal rule
 *  - Link (adds target=_blank for external URLs)
 *
 * Storage format is TipTap's native JSONContent shape, persisted directly
 * to Supabase `posts.body_ja` / `body_ko` (jsonb columns). Rendering to
 * HTML for public pages is done server-side in `src/lib/tiptap/render.ts`
 * so the reader never downloads the editor bundle.
 */

type Props = {
  value: JSONContent | null;
  onChange: (next: JSONContent) => void;
  placeholder?: string;
  // Label on the hidden <textarea> mirror below — screen readers and
  // server-action form submission both read it.
  ariaLabel?: string;
  // Name of the hidden <input> so the surrounding form can submit the
  // JSON string directly without a separate client-side serialise step.
  name?: string;
};

export function TipTapEditor({ value, onChange, placeholder, ariaLabel, name }: Props) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        // We own heading sizes (H1 = page title) so drop H1 entirely and
        // let H2/H3 be the only heading levels inside the body.
        heading: { levels: [2, 3] },
        // Configure StarterKit's bundled Link extension instead of adding
        // a separate one (see top-of-file note about the v3 duplicate-name
        // warning).
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            rel: 'noopener noreferrer',
            target: '_blank',
          },
        },
      }),
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content: value ?? '',
    immediatelyRender: false, // avoids SSR hydration mismatch in Next.js App Router
    editorProps: {
      attributes: {
        // Focus ring + min height + prose-ish typography. Kept to vanilla
        // Tailwind classes so the rest of the site can theme the editor
        // uniformly via CSS variables.
        class:
          'hand-box min-h-[200px] w-full rounded-md bg-[var(--background)] px-4 py-3 text-base leading-relaxed focus:ring-2 focus:ring-[var(--accent)] focus:outline-none',
        'aria-label': ariaLabel ?? 'Editor',
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getJSON());
    },
  });

  // When the parent swaps `value` (e.g. language tab switch), push the
  // new content into the existing editor instance instead of remounting.
  // Remounting loses focus and causes a visible flash.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(value ?? { type: 'doc', content: [] })) {
      editor.commands.setContent(value ?? '', { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="hand-box min-h-[200px] w-full rounded-md bg-[var(--background)] px-4 py-3 text-sm text-zinc-400">
        {placeholder ?? '...'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      {/* Hidden JSON mirror so <form action> submissions include the body
          without a client-side FormData patch. Server action parses this
          field back into a JSONContent object. */}
      {name ? <input type="hidden" name={name} value={JSON.stringify(editor.getJSON())} /> : null}
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean, label: string, onClick: () => void) => (
    <button
      type="button"
      onMouseDown={(e) => {
        // Preserve editor focus when clicking a toolbar button — browsers
        // move focus to the button on mousedown and TipTap then reports
        // the wrong selection state.
        e.preventDefault();
        onClick();
      }}
      aria-pressed={active}
      aria-label={label}
      className={`rounded-md border px-2 py-1 text-xs transition-colors ${
        active
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]'
          : 'border-[var(--border)] bg-[var(--background)] text-zinc-600 hover:border-[var(--accent)] dark:text-zinc-400'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div role="toolbar" aria-label="Editor toolbar" className="flex flex-wrap gap-1">
      {btn(editor.isActive('bold'), 'B', () => editor.chain().focus().toggleBold().run())}
      {btn(editor.isActive('italic'), 'I', () => editor.chain().focus().toggleItalic().run())}
      {btn(editor.isActive('heading', { level: 2 }), 'H2', () =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(),
      )}
      {btn(editor.isActive('heading', { level: 3 }), 'H3', () =>
        editor.chain().focus().toggleHeading({ level: 3 }).run(),
      )}
      {btn(editor.isActive('bulletList'), '• List', () =>
        editor.chain().focus().toggleBulletList().run(),
      )}
      {btn(editor.isActive('orderedList'), '1. List', () =>
        editor.chain().focus().toggleOrderedList().run(),
      )}
      {btn(editor.isActive('blockquote'), '" Quote', () =>
        editor.chain().focus().toggleBlockquote().run(),
      )}
      {btn(false, '— HR', () => editor.chain().focus().setHorizontalRule().run())}
      {btn(editor.isActive('link'), '🔗 Link', () => {
        const prev = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('URL', prev ?? 'https://');
        if (url === null) return;
        if (url === '') {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
          return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      })}
    </div>
  );
}
