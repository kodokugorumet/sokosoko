# 01. Information Architecture — 정보 구조

와이어프레임 v1 에서 확정된 사이트맵과 메뉴/푸터 구조.

## 1.1 사이트맵

```
釜山暮らし。いもじょも (Top page)
├─ 暮らす (Life)
│   ├─ 引っ越し / 部屋探し
│   ├─ ゴミの捨て方
│   ├─ 運転免許
│   ├─ 銀行・行政
│   └─ Meet up (오프라인 만남)
├─ 学ぶ (Study Abroad / Work)
│   ├─ 語学学校 (How to Take Lesson)
│   ├─ 大学 (University)
│   ├─ 大学院 (Graduate School)
│   └─ How to Search School
│       ├─ Document for Apply
│       ├─ VISA Apply
│       ├─ ARC Apply
│       ├─ Extension VISA Apply
│       └─ Course Registration
├─ 旅する (Trip)
│   ├─ Travel Route
│   ├─ Food (グルメ)
│   ├─ Subway (地下鉄)
│   └─ KTX / 行政 / ITX
├─ Q&A (Message Board, 가입제)
└─ About (소코소코 소개)
    ├─ 모임 철학 (건전한 관계 지향)
    ├─ 운영진 소개
    ├─ 참여 안내 (요일·반·대기 신청)
    └─ Contact
```

## 1.2 글로벌 헤더 슬롯

```
[브랜드 로고]    LOG IN | MENU(☰) | [JP|KR]
```

- 카테고리 네비게이션은 MENU 드로어에 들어감 (와이어프레임 v1 기준)
- 좌측 정렬: 손글씨 폰트 브랜드 워드마크 (`釜山暮らし。いもじょも`)
- 우측 정렬: locale dropdown → LOG IN → MENU 햄버거

## 1.3 MENU 드로어 (우측 슬라이드인)

```
○ Top page
●  Blog
   ├─ Life
   ├─ Study Abroad / Work
   └─ Trip
●  Q&A
─────────────
[Instagram]
privacy policy
Terms of use
Contact
```

## 1.4 푸터 슬롯 (와이어프레임 확정)

- privacy policy
- Terms of use
- Contact
- Instagram / X / LINE / note 아이콘
- © Sokosoko

> 카테고리 미러링(메뉴 = 푸터)은 hakko-blend.com 패턴. Phase 1 후반에 재도입.
