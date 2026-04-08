# Runbook: Cloudflare Workers 배포

> Next.js 16 사이트를 Cloudflare Workers 에 `@opennextjs/cloudflare` 어댑터로 배포하는 절차.
> 결정 근거: [`docs/adr/0002-hosting-cloudflare-workers.md`](../adr/0002-hosting-cloudflare-workers.md)

## 0. 사전 준비

- Cloudflare 계정 (무료)
- GitHub 저장소 push 권한
- (Studio 분리 작업이 끝난 상태) Worker 번들 < 3 MiB 검증

## 1. 첫 배포 — Cloudflare Workers Builds (대시보드, 권장)

CF 가 Linux 빌드 환경을 제공하므로 로컬 OS (Windows 포함) 에 영향받지 않음.

### 1-1. Workers & Pages 에서 Git 연동

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Import a repository**
2. GitHub 인증 → `kodokugorumet/sokosoko` 선택
3. **Production branch**: `main`

### 1-2. Build configuration

| 항목                  | 값                                                      |
| --------------------- | ------------------------------------------------------- |
| Framework preset      | `None`                                                  |
| Build command         | `pnpm install && pnpm exec opennextjs-cloudflare build` |
| Deploy command        | `pnpm exec opennextjs-cloudflare deploy`                |
| Root directory        | `/` (비워둠)                                            |
| Build comments on PRs | ✅                                                      |

### 1-3. 환경변수 (Variables and secrets)

| 키                               | 값                   | 비고                      |
| -------------------------------- | -------------------- | ------------------------- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`  | (Sanity 프로젝트 ID) | 빌드 타임에 인라인됨      |
| `NEXT_PUBLIC_SANITY_DATASET`     | `production`         |                           |
| `NEXT_PUBLIC_SANITY_API_VERSION` | `2025-01-01`         |                           |
| `NODE_VERSION`                   | `20`                 | 자동 감지되지만 명시 권장 |

### 1-4. Save and Deploy

- 첫 빌드: 4-6 분 (캐시 없음)
- 이후 빌드: 1-2 분
- 성공하면 `https://sokosoko.<your-account>.workers.dev` 활성화
- PR 마다 자동 preview URL 생성

## 2. Sanity Studio 배포 (1회)

Studio 는 Next 앱과 분리되어 Sanity 가 호스팅한다.

```bash
# 로컬에서 1번만 실행
pnpm sanity login   # GitHub/Google 로 Sanity 계정 로그인
pnpm sanity deploy  # studio hostname 입력 → sokosoko
```

→ `https://sokosoko.sanity.studio` 활성화. 이후 스키마 변경 시 `pnpm sanity deploy` 재실행.

## 3. 로컬 미리보기 (선택)

> ⚠️ Windows 에서는 OpenNext 가 symlink 권한 문제로 실패. WSL 또는 macOS/Linux 에서만 동작.

```bash
pnpm preview   # opennextjs-cloudflare build && opennextjs-cloudflare preview
```

→ `http://localhost:8787` 에서 실제 Workers 런타임으로 미리보기.

## 4. 수동 배포 (CI 우회 시)

> 보통 사용 X. CF Workers Builds 가 자동으로 배포함.

```bash
# 1. Cloudflare 인증
pnpm wrangler login

# 2. 빌드 + 배포
pnpm deploy   # opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

## 5. 커스텀 도메인 연결

1. CF 대시보드 → Workers & Pages → `sokosoko` → **Settings** → **Domains & Routes** → **Add** → **Custom Domain**
2. 도메인 입력 (예: `sokosoko.com`)
3. CF DNS 가 자동으로 SSL 발급 + 라우팅 설정

## 6. 트러블슈팅

### 빌드 성공 / 배포 실패: "Worker exceeded the size limit of 3 MiB"

- 원인: 큰 의존성이 worker 번들에 포함됨
- 진단: 배포 로그의 "5 largest dependencies" 확인
- 해결:
  - Sanity Studio 가 임베디드되어 있다면 분리 (이미 분리됨)
  - `@vercel/og` 같은 무거운 lib 회피
  - dynamic import 로 lazy load

### "Node.js middleware is not currently supported"

- 원인: `src/proxy.ts` 가 Node.js 런타임 전용으로 빌드됨
- 해결: `src/middleware.ts` (레거시 파일명) 로 유지 — Edge runtime 으로 빌드됨

### 환경변수가 빌드에 반영 안 됨

- `NEXT_PUBLIC_*` 는 빌드 타임에 코드에 인라인됨
- CF 대시보드에서 환경변수 추가 후 **재배포** 필요 (자동 트리거되지 않음)

### Windows 로컬에서 `pnpm preview` / `pnpm deploy` 실패

- 원인: OpenNext 가 symlink 를 사용하는데 Windows 는 권한 문제
- 해결: WSL2 환경에서 실행, 또는 CF Workers Builds (Git push) 에 위임

## 7. 모니터링

- **Logs**: CF 대시보드 → Workers → `sokosoko` → **Logs** (실시간 tail 가능)
- **Analytics**: 같은 화면 → **Metrics** 탭 (요청 수, 응답 시간, 에러율)
- **Wrangler observability**: `wrangler.jsonc` 에 `"observability": { "enabled": true }` 설정됨
