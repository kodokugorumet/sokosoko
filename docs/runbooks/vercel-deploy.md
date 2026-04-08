# Runbook: Vercel 배포

> Next.js 16 사이트를 Vercel 에 배포하는 절차.
> 결정 근거: [`docs/adr/0003-hosting-vercel.md`](../adr/0003-hosting-vercel.md)

## 0. 사전 준비

- Vercel 계정 (GitHub 로그인 권장, 무료 Hobby 플랜)
- GitHub 저장소 push 권한
- Sanity 프로젝트 ID (`sanity.config.ts` 또는 `.env.local` 에서 확인)

## 1. 첫 배포 — Vercel 대시보드 (권장)

Vercel 이 Linux 빌드 환경을 제공하므로 로컬 OS 와 무관하게 빌드된다.

### 1-1. 프로젝트 import

1. https://vercel.com → **Add New...** → **Project**
2. GitHub 인증 → `kodokugorumet/sokosoko` 선택 → **Import**
3. **Framework Preset**: `Next.js` (자동 감지)
4. **Root Directory**: `./` (그대로)
5. **Build & Output Settings**: 모두 자동 (Next.js 기본값)

### 1-2. 환경변수 (Environment Variables)

| 키                               | 값                   | 비고                 |
| -------------------------------- | -------------------- | -------------------- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`  | (Sanity 프로젝트 ID) | 빌드 타임에 인라인됨 |
| `NEXT_PUBLIC_SANITY_DATASET`     | `production`         |                      |
| `NEXT_PUBLIC_SANITY_API_VERSION` | `2025-01-01`         | ADR-0001 명시 값     |

> Production / Preview / Development 3개 환경 모두에 동일하게 등록.

### 1-3. Deploy

- **Deploy** 버튼 클릭
- 첫 빌드: 2-4 분
- 이후 빌드: 1-2 분 (캐시 활용)
- 성공 시 `https://sokosoko-<hash>.vercel.app` 활성화
- `main` 푸시 → Production 자동 배포
- PR / 다른 branch 푸시 → Preview URL 자동 생성

## 2. Sanity Studio 확인

이 프로젝트는 Studio 를 임베디드 (`/studio`) 로 유지한다. 별도 배포 절차 없음.

- 배포 후 `https://<your-vercel-domain>/studio` 접속 → Sanity 로그인
- 스키마 변경 시 코드 push 만으로 자동 배포

## 3. 로컬 미리보기 (선택)

```bash
pnpm build
pnpm start   # http://localhost:3000
```

또는 Vercel CLI 사용:

```bash
pnpm dlx vercel link    # 프로젝트 연결 (1회)
pnpm dlx vercel dev     # Vercel 환경 모사
pnpm dlx vercel         # preview 배포
pnpm dlx vercel --prod  # production 배포
```

## 4. 커스텀 도메인 연결

1. Vercel 대시보드 → 프로젝트 → **Settings** → **Domains**
2. 도메인 입력 (예: `sokosoko.com`) → **Add**
3. DNS 설정 안내대로 A / CNAME 레코드 추가
4. SSL 자동 발급 (Let's Encrypt)

## 5. Phase 2: Hobby → Pro 업그레이드

광고 / 멤버십 도입 시점 (약관상 상업적 사용 시작):

1. Vercel 대시보드 → **Settings** → **Billing** → **Upgrade to Pro** ($20/월)
2. 코드 변경 0 — 클릭 한 번으로 전환
3. 대역폭 100 GB → 1 TB, 함수 실행 시간 한도 증가, 팀 멤버 추가 가능

## 6. 트러블슈팅

### 빌드 실패: 환경변수 누락

- 증상: `Error: Missing NEXT_PUBLIC_SANITY_PROJECT_ID`
- 해결: Settings → Environment Variables 에서 누락된 키 추가 → **Redeploy**

### `proxy.ts` 가 동작 안 함

- Vercel 은 `src/proxy.ts` 를 Next.js 16 표준 미들웨어로 자동 인식 (Node.js 런타임)
- 동작 안 하면 파일 위치 확인 — 반드시 `src/proxy.ts` (app router 사용 시 src 하위)

### `/studio` 가 404

- `proxy.ts` 의 matcher 가 `/studio` 를 제외하는지 확인
- 현재 설정: `'/((?!api|_next|_vercel|studio|.*\\..*).*)'`

### Hobby 플랜 대역폭 초과 알림

- Phase 1 트래픽으로는 거의 발생 X (예상치 < 5 GB/월)
- 발생 시 Pro 업그레이드 또는 이미지 CDN 검토

## 7. 모니터링

- **Deployments**: 대시보드 → 프로젝트 → **Deployments** (빌드 로그 / preview URL / rollback)
- **Logs**: 프로젝트 → **Logs** (실시간 함수 로그, 필터링 가능)
- **Analytics**: 프로젝트 → **Analytics** (Web Vitals, Hobby 무료)
- **Speed Insights**: 프로젝트 → **Speed Insights** (실측 Core Web Vitals)
