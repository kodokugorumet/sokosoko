/**
 * Embedded Sanity Studio at /studio
 * Catch-all route mounts the Studio client component.
 */
import Studio from './Studio';

export const dynamic = 'force-static';
export { metadata, viewport } from 'next-sanity/studio';

export default function StudioPage() {
  return <Studio />;
}
