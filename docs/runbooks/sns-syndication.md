# Runbook: SNS 자동 송출 (Sanity → X / Instagram / LINE)

> Sanity Studio 에서 새 글을 publish 하면 설정된 SNS 채널에 자동으로 송출하는
> 별도 webhook 의 등록 절차.
>
> 핸들러: [`src/app/api/syndicate/route.ts`](../../src/app/api/syndicate/route.ts)
> 디스패처: [`src/lib/syndicate/index.ts`](../../src/lib/syndicate/index.ts)
> 어댑터: `src/lib/syndicate/{x,instagram,line}.ts`
> 관련 ADR: NFR-OPS-06 (콘텐츠 멀티 채널 송출)

## 0. 설계 원칙 (왜 revalidate webhook 과 분리했나)

- **시크릿 분리** (`SANITY_SYNDICATE_SECRET` ≠ `SANITY_REVALIDATE_SECRET`):
  SNS 키만 회전하거나 송출만 정지해도 캐시 무효화는 안 끊긴다.
- **트리거 분리** (Create only, Update/Delete OFF):
  글을 수정할 때마다 SNS 에 두 번 올리지 않는다. 최초 publish 한 번만.
- **어댑터 패턴**: 각 플랫폼은 `isConfigured()` 로 자기 환경변수가 있을 때만
  활성화. 한 채널이 망가져도 webhook 은 200 으로 응답 (개별 결과는 응답
  body 의 `results[]` 에 들어 있음) — Sanity 의 retry 폭주를 막기 위함.
- **현재 상태**: **X 는 풀 구현** (OAuth 1.0a 자체 서명, `src/lib/syndicate/oauth1.ts`).
  Instagram / LINE 은 `isConfigured()` 만 반환하는 stub 이라 키가 있어도 `skipped`.

## 1. 사전 준비

- Sanity 프로젝트 owner/developer 권한
- Vercel 프로젝트 env vars 편집 권한
- 송출하려는 각 SNS 의 자격 증명 (아래 §3)

## 2. 공유 시크릿 생성 + Vercel 등록

```bash
openssl rand -base64 32   # 출력 복사
```

Vercel → Project → **Settings** → **Environment Variables**:

| Key                       | Value     | Environments                     |
| ------------------------- | --------- | -------------------------------- |
| `SANITY_SYNDICATE_SECRET` | 위 출력값 | Production, Preview, Development |

저장 후 해당 환경 **재배포** (env var 는 빌드 타임에 주입됨).

## 3. 플랫폼별 키 발급

키가 없는 플랫폼은 그냥 비워두면 된다 — 어댑터가 알아서 `skipped`.

### 3-1. X (Twitter) — 풀 구현 (현재 유일하게 동작하는 어댑터)

X 무료 티어는 월 1,500 post. OAuth 1.0a user context 4-tuple 필요 —
v2 write 엔드포인트는 OAuth 2.0 bearer 토큰으로는 posting 불가.

1. https://developer.x.com → Project & App 생성
2. **User authentication settings** → **Read and write** 권한 + Web App
3. **Keys and tokens** 에서 다음 4 개 값을 Vercel env vars 에 등록:

| Key                     | 설명                         |
| ----------------------- | ---------------------------- |
| `X_API_KEY`             | Consumer Key (API Key)       |
| `X_API_KEY_SECRET`      | Consumer Secret (API Secret) |
| `X_ACCESS_TOKEN`        | Access Token (user context)  |
| `X_ACCESS_TOKEN_SECRET` | Access Token Secret          |

> 4 개가 모두 있어야 `isConfigured()` 가 true. 하나라도 빠지면 어댑터는
> `skipped: credentials missing` 을 반환한다.

### 3-2. Instagram Graph API — stub

요구사항이 까다롭다:

- Facebook Page + Instagram **Business / Creator** 계정 연동
- 장기 토큰 (Page Access Token, 60 일 — 만료 전 refresh 필요)
- IG User ID (숫자 — `@handle` 아님)

| Key               |
| ----------------- |
| `IG_USER_ID`      |
| `IG_ACCESS_TOKEN` |

> 텍스트 전용 게시 API 가 없다. 풀 구현 시에는 Sanity coverImage 의
> CDN URL 을 container_id 만들 때 함께 보내야 함. coverImage 없는 글은
> IG 송출 자체가 불가능.

### 3-3. LINE Messaging API — stub

LINE Notify 는 2025-03-31 EOL. Messaging API 의 broadcast 엔드포인트만 옵션.

1. https://developers.line.biz → Provider → Messaging API channel 생성
2. **Channel access token** (long-lived) 발급

| Key                         |
| --------------------------- |
| `LINE_CHANNEL_ACCESS_TOKEN` |

> 무료 티어 broadcast ~500 건/월. `LINE_TARGET_ID` 는 향후 multicast 모드용
> 으로 예약 (지금은 미사용).

## 4. Sanity Studio 에서 webhook 등록

1. https://www.sanity.io/manage → 프로젝트 선택 → **API** → **Webhooks** → **Create webhook**
2. 다음 필드를 정확히 입력:

| 필드        | 값                                                                          |
| ----------- | --------------------------------------------------------------------------- |
| Name        | `sokosoko syndication`                                                      |
| URL         | `https://sokosoko.vercel.app/api/syndicate`                                 |
| Dataset     | `production`                                                                |
| Trigger on  | **Create** ✅ (Update / Delete 는 반드시 OFF)                               |
| Filter      | `_type == "post" && defined(publishedAt) && !(_id in path("drafts.**"))`    |
| Projection  | `{ _id, "slug": slug.current, "pillar": category->pillar, title, excerpt }` |
| HTTP method | `POST`                                                                      |
| API version | `2025-01-01`                                                                |
| Secret      | §2 에서 만든 `SANITY_SYNDICATE_SECRET` 값 그대로                            |

3. **Save**.

> ⚠️ Trigger 를 Update 로 잡으면 글 한 번 고칠 때마다 X 에 같은 글을
> 다시 올리게 된다. 반드시 **Create only**.

## 5. 동작 확인

1. Studio 에서 새 Post 1 건 생성 → publishedAt 채움 → **Publish**
2. Sanity Manage → Webhooks → **sokosoko syndication** → **Logs**:
   - **HTTP 200** + body `{ ok: true, post: {...}, results: [...] }`
   - `results[]` 안에서 어댑터별 상태 확인:
     - X 키가 있으면 → `{ adapter: 'x', configured: true, result: { status: 'ok', id: '...', url: 'https://x.com/i/web/status/...' } }`
     - 키가 없으면 → `{ status: 'skipped', reason: 'not configured' }`
3. X 타임라인에서 새 tweet 이 실제로 떴는지 확인.

## 6. 트러블슈팅

| 증상                                                   | 원인                                               | 해결                                                    |
| ------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------- |
| `500 SANITY_SYNDICATE_SECRET is not set on the server` | Vercel env var 누락 또는 등록 후 재배포 안 함      | §2 다시. 등록 후 **반드시 redeploy**                    |
| `401 Invalid signature`                                | Studio 에 적은 secret 과 Vercel env var 불일치     | 한쪽을 다시 복사해서 동기화                             |
| `400 Missing required fields`                          | Projection 이 위 §4 와 다름 (`_id` / `slug` 빠짐)  | Projection 을 정확히 위 표대로 다시 저장                |
| `results[].x.status === 'error'` + `401 Unauthorized`  | X 4-tuple 중 하나 이상이 틀림 / 만료               | developer.x.com 에서 Access Token 재생성 후 env 갱신    |
| `results[].x.status === 'error'` + `429 ... reset at`  | 월 1,500 post 한도 소진                            | 메시지에 포함된 reset 시각 이후 재시도 (또는 유료 플랜) |
| 같은 글이 두 번 송출됨                                 | webhook 의 Trigger 에 Update 가 켜져 있음          | Trigger 를 **Create only** 로 고침                      |
| 글 수정 후에도 SNS 에 안 올라감                        | 정상 동작 — Create 시점 한 번만 송출하는 것이 의도 | 의도적                                                  |

## 7. 시크릿 회전

```bash
openssl rand -base64 32   # 새 값 생성
```

1. Vercel env var 의 `SANITY_SYNDICATE_SECRET` 를 새 값으로 교체 → redeploy
2. Sanity Manage → Webhooks → sokosoko syndication → Secret 도 새 값으로 교체
3. 둘 다 바꾸기 전까지는 401 이 잠깐 발생 — 가능한 짧게.

> X Access Token 은 위와 별도로, developer.x.com → App → **Keys and tokens**
> 에서 Regenerate 후 Vercel env vars (`X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`)
> 만 갱신하면 됨. Consumer Key/Secret 까지 regen 할 필요는 없음.
