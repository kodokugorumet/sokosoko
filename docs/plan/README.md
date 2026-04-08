# 소코소코 제작 계획 / Sokosoko 制作プラン

> 부산을 거점으로 한 한일 커뮤니티 「소코소코」 공식 사이트의 제작 계획.
> 釜山を拠点にした韓日コミュニティ「소코소코」公式サイトの制作プラン。

이 디렉터리는 PRD + 회의 녹취 + 와이어프레임 v1 + 레퍼런스 사이트 4종(studyinshizuoka.jp / hakko-blend.com / lumiarch.ntt-east.co.jp / felissimo.co.jp/gopeace) 을 종합한 결과물을 **주제별로 분리**해 둔 것입니다.

## 목차 / Table of Contents

| #   | 파일                                                            | 내용                                      |
| --- | --------------------------------------------------------------- | ----------------------------------------- |
| 00  | [overview.md](./00-overview.md)                                 | 한 줄 요약, 핵심 의사결정, 변경 이력      |
| 01  | [information-architecture.md](./01-information-architecture.md) | 사이트맵, 메뉴/푸터 구조                  |
| 02  | [roadmap.md](./02-roadmap.md)                                   | Phase 0 ~ Phase 3 단계별 로드맵           |
| 03  | [ui-components.md](./03-ui-components.md)                       | 헤더/푸터/메인/블로그/카드/Q&A 상세 명세  |
| 04  | [tech-stack.md](./04-tech-stack.md)                             | 채택 스택, DB 필드 요건                   |
| 05  | [content-and-ux.md](./05-content-and-ux.md)                     | UI/UX 원칙, 콘텐츠 전략                   |
| 06  | [operations.md](./06-operations.md)                             | 역할 분담, 리스크, 액션 아이템, KPI, 부록 |

## 변경 이력 (요약)

| 버전 | 일자       | 주요 변경                                                                             |
| ---- | ---------- | ------------------------------------------------------------------------------------- |
| v1.0 | 2026-04-07 | PRD + 회의 녹취 기반 최초 작성                                                        |
| v1.1 | 2026-04-07 | 와이어프레임 v1 반영, 브랜드명·카테고리 확정, 레퍼런스 4종 분석, UI/DB 명세 추가      |
| v1.2 | 2026-04-08 | 단일 문서를 7개 파일로 분리, 호스팅 결정 변경 (CF Pages → CF Workers + Sanity 호스팅) |
| v1.3 | 2026-04-08 | 호스팅 재결정: CF Workers → **Vercel** (Hobby → Phase 2 시 Pro), 임베디드 Studio 유지 |

호스팅 결정의 상세한 근거는 [`docs/adr/0003-hosting-vercel.md`](../adr/0003-hosting-vercel.md) 참조 (ADR-0002 는 superseded).

배포 절차는 [`docs/runbooks/vercel-deploy.md`](../runbooks/vercel-deploy.md) 참조.
