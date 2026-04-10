import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PostCard } from '@/components/post/PostCard';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import {
  getProfileByNickname,
  listPublishedPostsByAuthor,
  listPublishedQuestionsByAuthor,
} from '@/lib/profiles/queries';
import type { UserRole } from '@/lib/posts/queries';

type Params = { locale: string; nickname: string };
type Locale = 'ja' | 'ko';

const ROLE_BADGE: Record<UserRole, string> = {
  admin: '👑',
  operator: '🏅',
  verified: '✅',
  member: '',
};

const ROLE_LABEL_JA: Record<UserRole, string> = {
  admin: '管理者',
  operator: '運営',
  verified: '認証ユーザー',
  member: 'メンバー',
};
const ROLE_LABEL_KO: Record<UserRole, string> = {
  admin: '관리자',
  operator: '운영진',
  verified: '인증 유저',
  member: '멤버',
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { nickname } = await params;
  if (!isSupabaseConfigured()) return { title: 'Profile' };
  const profile = await getProfileByNickname(nickname).catch(() => null);
  if (!profile) return { title: 'Not found' };
  return {
    title: `${ROLE_BADGE[profile.role] ? ROLE_BADGE[profile.role] + ' ' : ''}${profile.nickname}`,
    robots: { index: true, follow: true },
  };
}

/**
 * Public user profile page. Shows the user's published posts and
 * questions. The profile is read-only in this PR — editing (nickname,
 * bio, avatar) will come in a /settings page in a follow-up.
 */
export default async function UserProfilePage({ params }: { params: Promise<Params> }) {
  const { locale, nickname } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) notFound();

  const profile = await getProfileByNickname(nickname).catch((err) => {
    console.error('[UserProfilePage] getProfileByNickname failed', { nickname, err });
    return null;
  });
  if (!profile) notFound();

  const t = await getTranslations('Profile');
  const loc = locale as Locale;
  const roleLabel = loc === 'ja' ? ROLE_LABEL_JA[profile.role] : ROLE_LABEL_KO[profile.role];

  const [posts, questions] = await Promise.all([
    listPublishedPostsByAuthor(profile.id).catch(() => []),
    listPublishedQuestionsByAuthor(profile.id).catch(() => []),
  ]);

  const bio =
    loc === 'ja' ? (profile.bio_ja ?? profile.bio_ko) : (profile.bio_ko ?? profile.bio_ja);

  const joinDate = new Date(profile.created_at).toLocaleDateString(
    loc === 'ja' ? 'ja-JP' : 'ko-KR',
    { year: 'numeric', month: 'long' },
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:py-16">
      {/* Profile header */}
      <div className="mb-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-20 w-20 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-3xl">
            {ROLE_BADGE[profile.role] || '👤'}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <h1 className="font-hand text-3xl tracking-wide text-[var(--ink)] sm:text-4xl">
            {ROLE_BADGE[profile.role] ? `${ROLE_BADGE[profile.role]} ` : ''}
            {profile.nickname}
          </h1>
          <p className="text-sm text-zinc-500">
            {roleLabel} · {t('joinedAt', { date: joinDate })}
          </p>
          {bio ? (
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {bio}
            </p>
          ) : null}
        </div>
      </div>

      {/* Posts section */}
      {posts.length > 0 ? (
        <section className="mb-10">
          <h2 className="font-hand mb-4 text-xl tracking-wide text-[var(--ink)] sm:text-2xl">
            {t('postsHeading', { count: posts.length })}
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} locale={loc} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Questions section */}
      {questions.length > 0 ? (
        <section className="mb-10">
          <h2 className="font-hand mb-4 text-xl tracking-wide text-[var(--ink)] sm:text-2xl">
            {t('questionsHeading', { count: questions.length })}
          </h2>
          <ul className="flex flex-col gap-3">
            {questions.map((q) => {
              const title =
                loc === 'ja'
                  ? (q.title_ja ?? q.title_ko ?? '').trim()
                  : (q.title_ko ?? q.title_ja ?? '').trim();
              return (
                <li key={q.id}>
                  <Link
                    href={`/qa/${encodeURIComponent(q.slug)}`}
                    className="hand-box block rounded-md bg-[var(--background)] p-4 text-base font-medium tracking-tight text-[var(--ink)] transition-colors hover:bg-[var(--accent-soft)]"
                  >
                    Q. {title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {posts.length === 0 && questions.length === 0 ? (
        <div className="hand-box rounded-md bg-[var(--accent-soft)] p-10 text-center">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{t('emptyActivity')}</p>
        </div>
      ) : null}
    </div>
  );
}
