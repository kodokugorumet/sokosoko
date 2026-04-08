/**
 * Route-level loading UI shown while an App Router segment is streaming.
 * Intentionally minimal — a hand-drawn wordmark pulse — so it matches the
 * site's sketchy aesthetic without shifting layout.
 *
 * No translations: the single word is the brand short name, same in both
 * locales. Keeping it static also avoids pulling in the i18n runtime just
 * for a loading skeleton.
 */
export default function Loading() {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-xl items-center justify-center px-6 py-16">
      <p
        className="font-hand animate-pulse text-5xl tracking-wider text-[var(--accent)] sm:text-6xl"
        aria-label="Loading"
      >
        . . .
      </p>
    </div>
  );
}
