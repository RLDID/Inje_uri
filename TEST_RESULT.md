# Inje_uri Test Result Report

작성일: 2026-05-05
기준 브랜치: `test-ver1`
기준 문서: `TEST_PLAN.md`

## 1. 요약

현재 프로젝트는 `dev` 기준 `test-ver1` 브랜치에서 기본 빌드 검증, Prisma 검증, API 라우트 단위 테스트, lint, production build, 보안 감사까지 통과했다.

이번 단계에서 새로 추가한 자동 테스트는 Vitest 기반의 top-down API route 단위 테스트다. 각 API route handler를 직접 호출하고, 인증/서비스/Prisma 계층은 mock으로 고정해서 API 입력 검증, 인증 필요 여부, 응답 body, 하위 서비스 호출 계약을 확인했다.

현재 실패 중인 자동 테스트는 없다.

## 2. 통과한 검증 결과

| 구분 | 명령 또는 검증 | 결과 | 비고 |
| --- | --- | --- | --- |
| 의존성 설치 | `npm install` | 통과 | `package-lock.json` 갱신 포함 |
| Prisma client 생성 | `npm run prisma:generate` | 통과 | `src/generated/prisma` 기준 |
| Prisma schema 검증 | `npm run prisma:validate` | 통과 | schema 문법 및 datasource 검증 |
| DB migration | `npm run prisma:migrate:dev` | 통과 | 로컬 PostgreSQL 17 기준 |
| Seed data | `npm run prisma:seed` | 통과 | 기본 데이터 삽입 확인 |
| API 단위 테스트 | `npm run test` | 통과 | 5개 파일, 59개 테스트 전부 통과 |
| Lint | `npm run lint` | 통과 | ESLint error 없음 |
| Production build | `npm run build` | 통과 | Next.js build/type check/static generation 성공 |
| 보안 감사 | `npm audit --omit=dev` | 통과 | production dependency 기준 0 vulnerabilities |
| Diff whitespace | `git diff --check` | 통과 | CRLF 변환 경고만 존재 |
| Dev server smoke | `npm run dev` | 통과 | 로컬 기동 확인 |
| Standalone start smoke | `npm run start` | 통과 | build 산출물 기동 확인 |

Production build에서 남은 경고:

- Next.js 16 기준 `middleware` 파일 convention이 deprecated 되었고, `proxy`로 이전하라는 경고가 표시된다.
- 경고일 뿐 현재 build 실패 원인은 아니다.

## 3. 추가된 자동 테스트 구성

추가된 테스트 도구:

- `vitest`
- `vitest.config.ts`
- `tests/helpers/api.ts`
- `npm run test` 스크립트

테스트 방식:

- Next.js App Router API route handler를 직접 호출한다.
- `NextRequest` helper로 JSON, invalid JSON, dynamic route params를 구성한다.
- `getAuthUser`, `resolveCurrentUser`, 서비스 함수, Prisma client는 mock 처리한다.
- 실제 DB나 외부 API에 의존하지 않는 빠른 단위 테스트로 구성했다.

## 4. API 단위 테스트 통과 범위

### Auth / Session

테스트 파일: `tests/api/auth.test.ts`

통과한 항목:

- `POST /api/auth/inje-check`
  - malformed JSON 검증 실패 처리
  - 정상 학생 인증 요청
  - pre-signup cookie 설정 호출
- `POST /api/auth/login`
  - 필수 credential 누락 검증
  - 로그인 성공 응답
  - session cookie 설정 및 app access cookie 삭제 호출
- `POST /api/auth/register`
  - 잘못된 email 검증 실패
  - 회원가입 입력값 trim/lowercase/number 변환
  - pre-signup token 전달
  - 가입 후 session/app/pre-signup cookie 정리 호출
- `GET /api/auth/me`
  - 미인증 사용자 차단
  - 인증 사용자 session summary 반환
- `POST /api/auth/logout`
  - 현재 session id로 logout 서비스 호출
  - logout 후 auth cookie 정리 호출

### User / Profile / Email

테스트 파일: `tests/api/user-profile.test.ts`

통과한 항목:

- `GET /api/users/me`
  - 미인증 사용자 차단
  - 현재 사용자 프로필 조회
- `PATCH /api/users/me`
  - malformed JSON 검증 실패
  - 프로필 수정 서비스 호출 계약 확인
- `GET /api/profile-taxonomy`
  - 인증 필요 여부
  - taxonomy 데이터 반환
- `POST /api/users/me/images`
  - multipart form data 기반 프로필 이미지 업로드
  - 201 응답 확인
- `DELETE /api/users/me/images/[imageId]`
  - 잘못된 image id 검증 실패
  - 정상 삭제 서비스 호출
- `POST /api/email-verifications/request`
  - 이메일 인증 요청 응답 형식 확인
- `POST /api/email-verifications/confirm`
  - malformed JSON 검증 실패
  - 인증 코드 확인 응답 형식 확인

### Recommendation / Interest / Matching Entry

테스트 파일: `tests/api/recommendation-interest.test.ts`

통과한 항목:

- `GET /api/recommendations/today`
  - 미인증 사용자 차단
  - 오늘 추천 조회 서비스 호출
- `POST /api/recommendations/select`
  - 잘못된 `recommendation_item_id` 검증
  - 추천 후보 선택 서비스 호출
- `POST /api/recommendations/[itemId]/dismiss`
  - 잘못된 path id 검증
  - 추천 후보 제외 서비스 호출
- `GET /api/interests/received`
  - 받은 관심 목록 조회
- `POST /api/interests/send`
  - 잘못된 target id 검증
  - 관심 보내기 서비스 호출
- `POST /api/interests/[interestId]/accept`
  - 잘못된 path id 검증
  - 관심 수락 서비스 호출
- `POST /api/interests/[interestId]/decline`
  - 관심 거절 서비스 호출
- `GET /api/recommendation-settings`
  - 추천 설정 조회
- `PATCH /api/recommendation-settings`
  - 허용 필드만 서비스에 전달하는지 확인
- `POST /api/batch/recommendations`
  - 잘못된 batch secret 차단
  - 이미 추천 생성된 사용자를 제외하고 batch 생성 호출

### Feed / Comment / Safety

테스트 파일: `tests/api/feed-safety.test.ts`

통과한 항목:

- `GET /api/feeds`
  - 잘못된 cursor 검증
  - keyword/cursor 기반 목록 조회
- `POST /api/feeds`
  - 빈 text 검증
  - feed 생성 서비스 호출
- `GET /api/feeds/[id]`
  - 잘못된 feed id 검증
  - feed 상세 조회
- `PATCH /api/feeds/[id]`
  - 수정 필드 없음 검증
  - text/keyword 수정 서비스 호출
- `DELETE /api/feeds/[id]`
  - feed 삭제 서비스 호출
- `POST /api/feeds/[id]/view`
  - 조회 기록 서비스 호출
- `POST /api/feeds/[id]/comments`
  - 빈 comment content 검증
  - comment 생성 서비스 호출
- `GET /api/feeds/[id]/comments`
  - comment 목록 조회
- `GET /api/feeds/keywords`
  - feed keyword 목록 조회
- `GET /api/feeds/mine`
  - 현재 활성 feed 없음 응답 확인
- `GET /api/feeds/commented-by-me`
  - 내가 댓글 단 feed 목록 조회
- `POST /api/feeds/comments/[id]/select-chat`
  - 잘못된 comment id 검증
  - comment 기반 chat 생성 진입 호출
- `GET /api/blocks`
  - 차단 목록 조회
- `POST /api/blocks`
  - 잘못된 blocked user id 검증
  - 사용자 차단 서비스 호출
- `DELETE /api/blocks`
  - 차단 해제 서비스 호출
- `POST /api/blocks/phone`
  - 잘못된 E.164 전화번호 검증
  - 전화번호 차단 서비스 호출
- `POST /api/reports`
  - 잘못된 target type 검증
  - 신고 생성 서비스 호출

### Chat / Message / Place

테스트 파일: `tests/api/chat-place.test.ts`

통과한 항목:

- `POST /api/chat-room`
  - source field 누락 검증
  - chat room 생성 서비스 호출
  - 201 응답 확인
- `GET /api/chat-room`
  - `tab=unread` 목록 조회
- `GET /api/chat-room/[id]`
  - 잘못된 room id 검증
  - room 상세 조회
- `PATCH /api/chat-room/[id]/leave`
  - room 나가기 서비스 호출
- `PATCH /api/chat-room/[id]/block`
  - room 차단 서비스 호출
- `GET /api/chat-room/[id]/messages`
  - 기본 cursor/limit 처리 확인
- `POST /api/chat-room/[id]/messages`
  - 빈 메시지 검증
  - trim된 메시지 전송
  - 201 응답 확인
- `POST /api/chat-room/[id]/read`
  - 잘못된 read cursor 검증
  - 읽음 처리 서비스 호출
- `GET /api/places`
  - 인증 필요 여부
  - category/tag 필터 전달
- `POST /api/chat-room/[id]/place-suggestions`
  - 잘못된 place id 검증
  - 장소 추천 생성 서비스 호출
  - 201 응답 확인
- `GET /api/chat-room/[id]/place-suggestions`
  - 장소 추천 상태 조회
- `PATCH /api/chat-room/[id]/place-suggestions/[suggestionId]`
  - 잘못된 status 검증
  - 장소 추천 상태 변경 서비스 호출

## 5. 현재 통과 기준에서 확인된 안정성

확인된 것:

- API route handler의 주요 happy path와 validation path가 정상 동작한다.
- 인증이 필요한 주요 API에서 unauthenticated 요청 차단이 동작한다.
- route params, query string, JSON body, multipart body 처리가 기본 계약에 맞는다.
- route handler가 하위 service layer에 넘기는 핵심 인자가 의도대로 전달된다.
- Next.js production build와 TypeScript type check가 통과한다.
- ESLint 기준 코드 품질 오류가 없다.
- production dependency 보안 감사 결과 취약점이 없다.
- PostgreSQL 17 기준 Prisma generate, validate, migrate, seed 흐름이 통과했다.

## 6. 보완해야 할 테스트

### 6.1 DB 통합 테스트

현재 API 단위 테스트는 Prisma와 service layer를 mock으로 대체한다. 따라서 실제 DB constraint, transaction, relation, unique index, cascade/soft delete 동작은 아직 자동으로 검증하지 않는다.

보완 필요 항목:

- Prisma repository 단위 통합 테스트
- 테스트 전용 PostgreSQL database reset/seed fixture
- 회원가입 중복 login/email/nickname 실제 unique constraint 검증
- feed/comment/chat 생성 시 transaction rollback 검증
- block, report, recommendation, interest 관계 데이터 정합성 검증
- chat room participant, message read state, room expiry DB 상태 검증

### 6.2 Service layer 테스트

현재 route가 service를 올바르게 호출하는지는 확인했지만, service 내부 비즈니스 규칙 전체를 자동 검증하지는 않는다.

보완 필요 항목:

- 추천 후보 필터링 로직
  - 차단 관계 제외
  - 같은 사용자 제외
  - 이미 관심/매칭된 사용자 제외
  - 최근 dismiss/decline cooldown 제외
  - 나이/학과/학년 설정 반영
- 관심 수락/거절 상태 전이
- 매칭 생성 중복 방지
- 채팅방 7일 재매칭 제한
- 피드 1인 1개 active 제한
- 댓글 1인 1회 제한
- 신고와 차단 동시 처리

### 6.3 UI / E2E 테스트

현재 자동 테스트는 API route 중심이다. 실제 브라우저에서 사용자가 보는 화면과 라우팅 동작은 아직 자동화되어 있지 않다.

보완 필요 항목:

- Playwright 기반 mobile viewport smoke test
- 보호 라우트 redirect 검증
  - `/match`
  - `/interest`
  - `/chat`
  - `/self-date`
  - `/my`
- 회원가입 전체 flow
- 로그인/로그아웃 flow
- 추천 선택 flow
- 관심 수락 후 채팅방 이동 flow
- feed 작성/수정/삭제 flow
- 댓글 작성 후 chat 선택 flow
- profile image upload/delete UI flow

### 6.4 외부 API mock 테스트

인제대 학생 인증 API는 실제 외부 호출에 의존하면 테스트가 불안정해진다.

보완 필요 항목:

- 외부 인제대 인증 API deterministic mock
- upstream timeout/error 응답 처리 테스트
- 인증 성공 후 pre-signup token 만료 테스트
- birth/student number mismatch 테스트

### 6.5 시간 경계 테스트

추천, feed, chat은 KST 날짜와 만료 시간이 중요하다. 현재 테스트는 일반적인 호출 계약 위주라 시간 경계는 부족하다.

보완 필요 항목:

- KST 자정 전후 추천 batch 날짜 계산
- feed 만료 직전/직후 노출 여부
- chat room 2시간/24시간 만료 처리
- session expiry와 touch interval
- interest expiry와 decline delay timestamp

### 6.6 보안 workflow 자동 검증

`npm audit --omit=dev`는 통과했지만, GitHub Actions의 `security.yml`과 동일한 suspicious file scan을 로컬에서 자동 테스트로 실행한 것은 아니다.

보완 필요 항목:

- `.github/workflows/security.yml`과 동일한 파일명 scan 로컬 스크립트화
- executable file scan 자동화
- push hook과 CI scan 결과 비교
- dev dependency까지 포함한 보안 감사 정책 결정

### 6.7 문구/인코딩 검증

현재 코드 일부의 한글 문자열은 mojibake 형태로 보인다. build는 통과하지만, 사용자에게 표시되는 문구 품질은 자동 검증되지 않는다.

보완 필요 항목:

- API error message 인코딩 복구
- UI 표시 문자열 확인
- `src/lib/openapi.ts` 문서 문자열 확인
- OpenAPI 문서 렌더링 smoke test

## 7. 현재 남은 리스크

| 리스크 | 영향 | 우선순위 |
| --- | --- | --- |
| API 단위 테스트가 DB를 mock 처리함 | 실제 DB relation/transaction 버그를 놓칠 수 있음 | 높음 |
| Service layer 비즈니스 규칙 자동 검증 부족 | 추천/매칭/채팅/피드 핵심 정책 회귀 가능 | 높음 |
| UI E2E 테스트 없음 | 실제 사용자 flow나 redirect 문제를 놓칠 수 있음 | 높음 |
| 외부 인제대 인증 API mock 부족 | 인증 flow 테스트가 불안정하거나 수동에 의존 | 중간 |
| KST/만료 시간 경계 테스트 부족 | 자정/만료 시점에서 추천, feed, chat 오류 가능 | 중간 |
| `middleware` convention deprecated | 향후 Next 업그레이드 시 build 경고가 실패로 바뀔 가능성 | 중간 |
| 한글 문자열 mojibake | 사용자 경험 저하 및 API 문서 품질 저하 | 중간 |
| 일부 UI가 mock data 사용 | API/DB 상태와 화면 상태가 불일치할 수 있음 | 중간 |

## 8. 다음 테스트 권장 순서

1. Repository/Service 통합 테스트 추가
   - 테스트 DB reset/seed helper부터 만든다.
   - 추천, 관심, 매칭, 채팅, 피드 핵심 정책을 우선 검증한다.

2. Playwright UI smoke test 추가
   - `/`, `/login`, `/register`, `/match`, `/interest`, `/chat`, `/self-date`, `/my`를 모바일 viewport 기준으로 확인한다.
   - 보호 라우트 redirect를 자동화한다.

3. 외부 인증 API mock 계층 분리
   - 실제 upstream 호출 없이 학생 인증 성공/실패/timeout을 재현한다.

4. 시간 고정 테스트 도입
   - KST 날짜, 만료 시간, session expiry를 fake timer로 검증한다.

5. CI에 테스트 명령 추가
   - `npm run lint`
   - `npm run test`
   - `npm run prisma:validate`
   - `npm run build`
   - 보안 scan

## 9. 결론

현재 기준으로 프로젝트는 기본 실행 가능성, production build, lint, Prisma 준비 과정, production dependency 보안 감사, API route 단위 테스트를 모두 통과했다.

다만 이번 테스트는 route layer 중심의 단위 테스트이므로 실제 DB와 service business logic, 브라우저 UI flow까지 검증했다고 보기는 어렵다. 다음 단계에서는 DB 통합 테스트와 Playwright E2E 테스트를 추가해야 전체 프로젝트 품질을 더 안정적으로 보장할 수 있다.
