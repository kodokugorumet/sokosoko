# Runbook: Sanity → Next.js Revalidate Webhook 등록

> Sanity Studio 에서 콘텐츠를 발행하면 Vercel 의 ISR 캐시가 즉시 무효화되도록
> GROQ-Powered Webhook 을 등록하는 절차.
>
> 핸들러 구현: [`src/app/api/revalidate/route.ts`](../../src/app/api/revalidate/route.ts)
> 관련 NFR: NFR-OPS-05 (콘텐츠 무중단 갱신)

## 0. 사전 준비

- Sanity 프로젝트 owner / developer 권한 (Manage 콘솔 접근)
- Vercel 프로젝트 env vars 편집 권한
- 배포된 사이트 URL (예: `https://sokosoko.vercel.app`)

## 1. 공유 시크릿 생성

핸들러는 모든 요청의 HMAC 서명을 검증한다. 서명 키는 Sanity 와 Vercel 양쪽이 공유하는
난수 문자열 — 노출되면 누구나 캐시를 무효화할 수 있으니 외부에 적지 말 것.

```bash
# 32 바이트 base64 (안전 길이). 결과를 클립보드에 복사.
openssl rand -base64 32
```

> Windows PowerShell:
> `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))`

## 2. Vercel 에 시크릿 등록

1. https://vercel.com/<team>/sokosoko → **Settings** → **Environment Variables**
2. **Add New** 클릭
3. 입력:
   - **Name**: `SANITY_REVALIDATE_SECRET`
   - **Value**: 1 단계에서 생성한 문자열
   - **Environments**: `Production`, `Preview`, `Development` 모두 체크
4. **Save** → 기존 배포에는 적용되지 않으므로 다음 단계에서 재배포

## 3. 재배포 (시크릿 반영)

env var 를 추가해도 기존 deployment 는 빌드 시점의 환경을 그대로 쓴다. 재배포해야
새 시크릿이 server runtime 에 들어간다.

- **Vercel 대시보드** → **Deployments** → 최신 production deployment 의 `⋯` → **Redeploy**
- 또는 빈 commit 으로 강제 재배포:
  ```bash
  git commit --allow-empty -m "chore(deploy): refresh env (SANITY_REVALIDATE_SECRET)"
  git push
  ```

## 4. Sanity Studio 에 웹훅 등록

1. https://www.sanity.io/manage → 프로젝트 선택 → **API** 탭 → **Webhooks** → **Create webhook**
2. 다음 값을 입력:

| 필드            | 값                                                                    |
| --------------- | --------------------------------------------------------------------- |
| **Name**        | `Vercel ISR revalidate (production)`                                  |
| **Description** | `POST /api/revalidate — invalidates ISR tags after publish/unpublish` |
| **URL**         | `https://sokosoko.vercel.app/api/revalidate`                          |
| **Dataset**     | `production`                                                          |
| **Trigger on**  | `Create` ✅ / `Update` ✅ / `Delete` ✅                               |
| **Filter**      | `_type in ["post","category","author","question"]`                    |
| **Projection**  | (아래 코드 블록 그대로 붙여넣기)                                      |
| **HTTP method** | `POST`                                                                |
| **API version** | `v2025-01-01` (또는 그 이후)                                          |
| **Secret**      | 1 단계에서 생성한 문자열 (Vercel 에 등록한 값과 **반드시 동일**)      |

**Projection** (정확히 이 내용 — 핸들러가 파싱하는 필드와 일치해야 함):

```groq
{
  _type,
  "slug": slug.current,
  "pillar": coalesce(pillar, category->pillar)
}
```

> 핵심 포인트:
>
> - `coalesce` 로 question 의 직접 `pillar` 와 post 의 `category->pillar` 를 한 키로 통일.
> - `slug` 는 question 과 post 모두 `slug.current` 형태이므로 동일 필드 추출.
> - 그 외 필드를 추가로 보내도 무해하지만, payload 가 작을수록 낫다.

3. **Save** 클릭.

## 5. 동작 확인

### 5-1. Studio 에서 테스트 트리거

1. Studio 의 아무 post / question 문서를 열어 한 글자라도 수정 → **Publish**
2. **Manage → Webhooks → 방금 만든 webhook → Logs** 탭 열기
3. 가장 위 항목이 **HTTP 200 OK** 이고 응답이 다음과 비슷한지 확인:

   ```json
   {
     "ok": true,
     "revalidated": ["sanity", "post", "pillar:life", "post:hello-busan"]
   }
   ```

### 5-2. 페이지가 실제로 갱신되었는지 확인

1. 수정한 글의 공개 URL 을 새 시크릿/시크릿 창에서 열기
2. 변경 내용이 즉시 반영되어야 함 (refresh 한 번)
3. 반영이 안 된다면 6 단계로

## 6. 트러블슈팅

| 증상                                      | 원인 후보                                                | 조치                                                                                       |
| ----------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `401 Missing signature header`            | Studio 가 secret 없이 호출 (Webhook 설정에서 누락)       | Sanity 콘솔에서 Secret 필드 다시 입력 후 Save                                              |
| `401 Invalid signature`                   | Vercel 와 Sanity 의 secret 불일치                        | 두 곳을 같은 값으로 다시 설정 → Vercel 재배포                                              |
| `500 SANITY_REVALIDATE_SECRET is not set` | 재배포 누락, env var 가 runtime 에 없음                  | 3 단계 재배포 다시 수행. Vercel **Functions Logs** 에서 같은 에러 메시지가 사라졌는지 확인 |
| `200 OK` 인데 페이지가 그대로             | Projection 에 `slug` / `pillar` 가 빠져 좁은 태그 미적용 | 4 단계의 projection 코드 블록을 그대로 다시 붙여넣기                                       |
| Webhook log 자체가 없음                   | Trigger 체크 누락, Filter 가 너무 좁음                   | Create / Update / Delete 모두 체크, Filter 가 위 표와 동일한지 확인                        |

## 7. 시크릿 회전

- 분기마다 또는 누출 의심 시:
  1. 1 단계 재실행으로 새 시크릿 생성
  2. Vercel env var 갱신 → 재배포
  3. Sanity Webhook 의 Secret 필드 교체 → Save
  4. Studio 에서 test publish → 5-1 확인

## 참고

- ADR: [`0001-sanity-cms.md`](../adr/0001-sanity-cms.md)
- 핸들러 코드: [`src/app/api/revalidate/route.ts`](../../src/app/api/revalidate/route.ts)
- ISR 태그 정의: 페이지별 `sanityFetch({ tags: [...] })` 호출부 (검색은 의도적으로 태그 없음)
