import { generateHTML } from '@tiptap/html';
import { StarterKit } from '@tiptap/starter-kit';
import { Link } from '@tiptap/extension-link';
import type { JSONContent } from '@tiptap/core';

/**
 * Server-side renderer for TipTap JSON documents. Uses the exact same
 * extension set the editor uses (`src/components/editor/TipTapEditor.tsx`)
 * so round-trips are lossless: what the author typed is what the reader
 * sees, byte-for-byte.
 *
 * Lives in `src/lib/tiptap/` (not in the editor component folder) so
 * public Server Components can import it without dragging the whole
 * React editor bundle into the client. `@tiptap/html` is standalone —
 * no React, no ProseMirror view layer.
 */

const EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: {
      rel: 'noopener noreferrer',
      target: '_blank',
    },
  }),
];

export function renderTipTapHtml(doc: JSONContent | null | undefined): string {
  if (!doc) return '';
  try {
    return generateHTML(doc, EXTENSIONS);
  } catch {
    // Malformed JSON (e.g. an older schema version we can no longer parse)
    // should not crash the reader's page. Return empty so the caller's
    // fallback banner ("翻訳準備中" / "번역 준비 중") kicks in.
    return '';
  }
}

/**
 * Empty-ish check: returns true if the doc has no real text content.
 * Used to decide whether to show the bilingual fallback banner.
 */
export function isTipTapEmpty(doc: JSONContent | null | undefined): boolean {
  if (!doc) return true;
  const text = extractText(doc).trim();
  return text.length === 0;
}

function extractText(node: JSONContent): string {
  if (node.text) return node.text;
  if (!node.content) return '';
  return node.content.map(extractText).join('');
}
