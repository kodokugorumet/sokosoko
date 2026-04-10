# Runbook: Supabase 초기 셋업 (Phase 2-B)

> Supabase 프로젝트 생성 → 환경변수 등록 → 스키마 적용 → 첫 admin 부트스트랩.
>
> 관련 ADR: [ADR-0004 — Sanity 제거 + Supabase 단일 스택](../adr/0004-drop-sanity-for-supabase.md)
> 마이그레이션 파일: [`supabase/migrations/0001_init.sql`](../../supabase/migrations/0001_init.sql)

## 1. Supabase 프로젝트 생성

1. https://supabase.com → 로그인 (GitHub 권장)
2. **New project**
3. 입력값:

| 항목              | 값                                                                   |
| ----------------- | -------------------------------------------------------------------- |
| Name              | `sokosoko`                                                           |
| Database password | 강력한 값 — 반드시 1Password 등에 저장 (분실 시 복구 매우 어려움)    |
| Region            | **Northeast Asia (Seoul) — `ap-northeast-2`** ⚠️ 다른 리전 선택 금지 |
| Pricing plan      | Free                                                                 |

4. **Create new project** → 약 2 분 대기

## 2. 환경변수 3 개 등록 (Vercel)

Supabase 대시보드 → **Project Settings** → **API** 에서 값 복사:

| Vercel env key                  | Supabase 값                                             | 환경                               |
| ------------------------------- | ------------------------------------------------------- | ---------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | **Project URL** (`https://xxxxx.supabase.co`)           | Production / Preview / Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon public** key (긴 JWT)                            | Production / Preview / Development |
| `SUPABASE_SERVICE_ROLE_KEY`     | **service_role** key (다른 JWT, 절대 클라이언트 노출 X) | Production / Preview / Development |

> ⚠️ `service_role` 키는 RLS 를 우회하는 마스터 키. 절대 `NEXT_PUBLIC_*` 로 시작하는 이름으로 등록하지 말 것.

저장 후 자동 redeploy 가 일어남 (또는 다음 PR merge 시 자동).

## 3. 스키마 + RLS + Storage 적용 (마이그레이션)

`supabase/migrations/` 아래 파일들을 번호 순서대로 전부 실행합니다. 각 파일은
idempotent 하게 작성되어 있어 여러 번 실행해도 안전합니다.

| 순서 | 파일                                                                                             | 내용                                                                             |
| ---- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 1    | [`0001_init.sql`](../../supabase/migrations/0001_init.sql)                                       | 6 개 테이블 (profiles/boards/posts/answers/comments/post_revisions) + RLS + seed |
| 2    | [`0002_comments_and_moderation.sql`](../../supabase/migrations/0002_comments_and_moderation.sql) | posts/answers/comments 의 DELETE 정책 (모더레이션용)                             |
| 3    | [`0003_storage_bucket.sql`](../../supabase/migrations/0003_storage_bucket.sql)                   | Storage 버킷 `post-covers` + storage.objects RLS 정책                            |

각 파일을 Supabase 대시보드 → **SQL Editor** → **New query** 에 붙여넣고
**Run** 누르면 됩니다. "Success. No rows returned" 가 뜨면 완료.

### 적용된 것 확인

- **Table Editor** 에 다음 6 개 테이블이 보여야 함:
  `profiles`, `boards` (4 행 시드: life / study / trip / qa), `posts`,
  `answers`, `comments`, `post_revisions`
- **Storage** 탭에 `post-covers` 버킷이 보여야 함 (Public 배지 표시)
- **Authentication** → **Policies** 에서 각 테이블에 RLS 정책이 등록돼 있어야 함

## 4. Email auth 활성화

Supabase 의 기본 auth 방식은 이메일 + 패스워드인데, 우리는 **매직 링크 전용** 으로 씁니다.

1. **Authentication** → **Providers** → **Email**
2. **Enable Email provider**: ON (기본 ON)
3. **Confirm email**: ON (가입 시 이메일 인증 강제 — 매직 링크가 곧 인증)
4. **Secure email change**: ON (권장)
5. (선택) **Disable signups**: OFF — 신규 가입 허용

## 5. Redirect URL 화이트리스트 등록

매직 링크 콜백이 우리 도메인으로만 돌아오도록:

1. **Authentication** → **URL Configuration**
2. **Site URL**: `https://sokosoko-one.vercel.app` (운영 도메인)
3. **Redirect URLs** 에 다음 4 개 추가:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3030/auth/callback`
   - `https://sokosoko-one.vercel.app/auth/callback`
   - `https://*.vercel.app/auth/callback` (Preview 배포 와일드카드)

> 등록 안 된 호스트로는 매직 링크가 동작하지 않음. PR preview 마다 새 호스트가 생기므로 와일드카드가 필요.

## 6. 첫 admin 계정 부트스트랩 (닭과 달걀 문제)

`profiles.role` 변경은 RLS 에 의해 admin 만 가능. 그런데 처음엔 admin 이 없음. 해결:

1. 본인 이메일로 사이트에서 **일반 가입** (`/login` → 매직 링크)
2. `/onboarding` 에서 닉네임 설정 (예: `imojomo`)
3. 가입 완료 후, Supabase 대시보드 → **SQL Editor** 에서 한 줄 실행:

```sql
update profiles set role = 'admin' where nickname = 'imojomo';
```

(또는 `where id = 'uuid-from-auth-users-table'` 로 더 정확히)

4. 사이트에서 새로고침 → 헤더에 👑 이모지가 닉네임 앞에 표시되면 성공

이후 추가 admin/operator 는 첫 admin 이 SQL 또는 (Phase 2-E 의) `/admin/users` 페이지에서 권한 부여.

## 7. 로컬 개발 (선택)

`pnpm dev` 로 로컬에서 auth flow 를 테스트하려면:

1. `.env.local` 파일에 위 3 개 키 동일하게 추가
2. `pnpm dev` 시작
3. http://localhost:3000/login 접속 → 매직 링크 발송 → 이메일 → 클릭 → 자동으로 로컬 호스트로 콜백
4. (Redirect URL 에 `http://localhost:3000/auth/callback` 가 등록돼 있어야 함 — §5 참조)

## 8. 트러블슈팅

| 증상                                             | 원인                                                  | 해결                                                  |
| ------------------------------------------------ | ----------------------------------------------------- | ----------------------------------------------------- |
| 매직 링크 클릭 시 `redirect_uri` 에러            | §5 의 Redirect URLs 에 그 호스트가 없음               | URL Configuration 에 호스트 추가                      |
| `/login` 진입 시 500 + "supabaseUrl is required" | Vercel env vars 가 빌드 시점에 안 들어옴              | env var 등록 후 재배포                                |
| 가입은 되는데 `profiles` row 가 없음             | `on_auth_user_created` 트리거가 안 걸림               | §3 마이그레이션을 다시 실행                           |
| `/onboarding` 에서 "이미 사용 중인 닉네임" 에러  | `profiles.nickname` UNIQUE 제약 → placeholder 와 충돌 | 다른 닉네임 시도. placeholder 는 `user_xxxxxxxx` 형식 |
| 헤더에 👑 가 안 보임                             | role 이 아직 'member'                                 | §6 SQL 실행 후 새로고침                               |
| Preview 배포에서만 매직 링크 안 됨               | Redirect URLs 에 와일드카드 누락                      | `https://*.vercel.app/auth/callback` 추가             |

## 9. 보안 체크리스트

- [ ] `SUPABASE_SERVICE_ROLE_KEY` 가 `NEXT_PUBLIC_*` prefix 없이 등록됐는가
- [ ] 모든 테이블에 RLS 가 enabled 인가 (Table Editor 에서 lock 아이콘 확인)
- [ ] Redirect URLs 에 운영/preview/local 만 있고 외부 호스트 없는가
- [ ] DB 비밀번호가 1Password 등에 저장됐는가
- [ ] 첫 admin 계정의 매직 링크 이메일이 운영자만 접근 가능한 메일함인가
