  # 인제우리 (Inje_uri)

  인제대학교 재학생 전용 소개팅 모바일 웹 앱. Next.js App Router 기반, 모바일 퍼스트 프로토타입.

  ## 브랜치 전략

      main
      └── dev
          ├── feature/기능이름
          ├── feature/기능이름
          └── ...

  | 브랜치 | 용도 |
  |---|---|
  | `main` | 배포용. 검증 완료된 코드만 병합 |
  | `dev` | 통합 개발 브랜치. feature 병합 후 검증 |
  | `feature/기능이름` | 기능 단위 작업 브랜치. dev에서 분기 |

  **흐름**

  1. `dev` → `feature/기능이름` 분기
  2. 기능 개발 완료 후 `dev`에 PR & merge
  3. `dev`에서 통합 검증 완료 후 `main`에 PR & merge

  > `main` 직접 push 금지. 반드시 `dev`를 거쳐야 함.

  ---

  ## 기술 스택

  | 분류 | 내용 |
  |---|---|
  | Framework | Next.js 16 (App Router) |
  | Language | TypeScript 5 |
  | UI | React 19 + Tailwind CSS v4 |
  | ORM | Prisma 7 |
  | DB | PostgreSQL 17 |
  | Runtime | Node.js 24 |

  ## 실행

  ```bash
  # 1. 패키지 설치
  npm install

  # 2. 환경변수 설정 (.env.example 참고)
  cp .env.example .env

  # 3. DB 마이그레이션
  npm run prisma:migrate:dev

  # 4. 시드 데이터
  npm run prisma:seed

  # 5. 개발 서버
  npm run dev
  ```

  ## 환경변수

  `.env.example` 참고. 필수 항목:

  ```
  DATABASE_URL="postgresql://postgres:비밀번호@localhost:5432/injeuri?schema=public"
  ```

  ## 디렉토리 구조

  ```
  src/
  ├── app/
  │   ├── (main)/               # 바텀 네비 있는 메인 레이아웃
  │   │   ├── match/            # 오늘 우리 (일일 추천)
  │   │   │   └── [id]/         # 프로필 상세
  │   │   ├── interest/         # 나를 좋아하는 사람
  │   │   ├── chat/             # 채팅 목록
  │   │   │   └── [id]/         # 채팅방
  │   │   ├── self-date/        # 셀프소개팅 피드
  │   │   │   ├── [id]/         # 스토리 상세
  │   │   │   ├── create/       # 스토리 작성
  │   │   │   └── mine/         # 내 스토리
  │   │   └── my/               # 마이페이지
  │   │       ├── profile/      # 프로필 보기
  │   │       │   └── edit/     # 프로필 편집 (키워드 선택형)
  │   │       ├── ideal-type/   # 이상형 설정
  │   │       ├── posts/        # 내 게시물
  │   │       └── settings/     # 설정
  │   └── page.tsx              # 루트 진입점
  ├── components/
  │   ├── chat/                 # ChatBubble, ChatInput, ChatPreview, ChatExpiryNotifier
  │   ├── interest/             # InterestCard
  │   ├── layout/               # BottomNav, PageContainer
  │   ├── match/                # ProfileCard, ProfileCardCarousel, InterestBanner, RecommendationNotice
  │   ├── navigation/           # NavigationTracker
  │   ├── profile/              # KeywordSelector, ProfilePreview, RecommendationSettingsFields
  │   ├── self-date/            # FeedCard, StoryCard, StoryViewer, MyStoriesView
  │   └── ui/                   # Badge, Button, Card, Chip, BottomSheet, Toast 등
  ├── lib/
  │   ├── data/                 # 목업 데이터 (chats, interests, stories, users)
  │   ├── navigation/           # 라우팅 유틸 (routes, history, viewState, hooks)
  │   ├── types/                # 도메인 타입 정의
  │   └── utils/                # 날짜, 피드, 추천 설정 등 유틸
  └── generated/
      └── prisma/               # Prisma 자동 생성 클라이언트 (직접 수정 금지)
  prisma/
  ├── schema.prisma
  ├── seed.js
  └── migrations/
  ```

  ## DB 주요 모델

  | 모델 | 설명 |
  |---|---|
  | `User` | 유저 (이름, 이메일, 학번, 학과, 키워드 등) |
  | `UserProfileImage` | 프로필 이미지 (복수, 정렬순) |
  | `Category` / `Keyword` | 키워드 카탈로그 (성격, 취미 등 카테고리별) |
  | `UserKeywordSelection` | 유저가 선택한 키워드 |
  | `RecommendationSetting` | 추천 필터 설정 (학과 제외, 연령대 등) |
  | `DailyRecommendation` | 일일 추천 (1일 1명 선택) |
  | `Interest` | 호감 (보낸/받은, 매칭 여부) |
  | `ChatRoom` | 채팅방 (만료 시간, 최대 5개 제한) |
  | `Message` | 채팅 메시지 |
  | `SelfDateFeed` | 셀프소개팅 24시간 스토리 |
  | `FeedComment` | 피드 댓글 (댓글로 채팅 생성 가능) |
  | `Block` / `PhoneBlock` / `Report` | 차단 및 신고 |
  | `Place` | 데이트 장소 추천 (채팅방 연동) |
  | `UserContact` | 연락처 기반 지인 필터링 |

  ## Prisma 명령어

  ```bash
  npm run prisma:generate       # 클라이언트 재생성
  npm run prisma:migrate:dev    # 마이그레이션 적용 (dev)
  npm run prisma:migrate:deploy # 마이그레이션 적용 (prod)
  npm run prisma:studio         # DB GUI
  npm run prisma:seed           # 시드 데이터 삽입
  ```

  ## 현재 상태

  - UI 프로토타입 완성 (목업 데이터 기반)
  - DB 스키마 및 마이그레이션 완료
  - API 라우트 및 실제 DB 연동 미구현 (`src/lib/data/`의 목업 데이터 사용 중)

  ## 핵심 기획

  - 데스크톱: 가운데 정렬된 앱 컬럼 / 모바일: 기기 폭 전체 활용
  - 일일 추천 1일 1명 선택, 자정 기준 리셋
  - 셀프소개팅은 24시간 스토리형
  - `나를 좋아하는 사람` 화면에서 바로 채팅 생성
  - 활성 채팅방 최대 5개 제한
  - 프로필 편집은 직접 입력이 아닌 선택형 키워드
  - 댓글로도 채팅방 생성 가능 (`source_type: comment`)