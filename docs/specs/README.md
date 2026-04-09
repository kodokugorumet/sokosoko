# Specifications

소코소코(Sokosoko / 釜山暮らし。いもじょも / 부산 살이. 이모저모) 프로젝트의 명세서 모음.

원본 계획 문서는 [`docs/plan/`](../plan/) 를 참조. 본 디렉토리는 그 계획을 토대로 정리한 SRS / FS / NFR + 진척도 기록.

| 파일                                           | 내용                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| [00-requirements.md](./00-requirements.md)     | 요구사항 명세서 (SRS) — 이해관계자, 사용자 분류, 핵심 요구, KPI  |
| [01-functional.md](./01-functional.md)         | 기능 명세서 (FS) — 사이트맵, 라우트, 컴포넌트, 스키마, 쿼리, SEO |
| [02-non-functional.md](./02-non-functional.md) | 비기능 명세서 (NFR) — 성능, SEO, 다국어, 보안, 가용성, 유지보수  |
| [03-changelog.md](./03-changelog.md)           | 일자별 개발 진척도 (PR 단위)                                     |

## 갱신 원칙

- **계획이 바뀌면** `docs/plan/*.md` 를 먼저 고치고 본 디렉토리에 동기화
- **기능이 추가되면** [01-functional.md](./01-functional.md) 의 표에 행을 추가
- **PR 이 머지되면** [03-changelog.md](./03-changelog.md) 에 한 줄 추가
- 명세서는 "현재 코드가 무엇을 하는가" 의 단일 진실 공급원
