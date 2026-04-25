# Proval 시나리오 리포트 (cal.diy)

## 이 문서가 뭐하는 건지

**Cal.diy**는 Cal.com 계열의 오픈소스 모노레포(Next.js, Prisma, tRPC 등)이다. 이 저장소는 **Proval**이라는 “코드리뷰/웹훅” 도구를 시험할 때 **현실에 가깝고 큰 diff**를 만들기 위한 **픽스처 리포**로 쓰려고, 의도적으로 여러 **기능 브랜치**를 만들고 원격(`origin`)에 푸시해 두었다.

이 `report.md`는:

- **어느 브랜치**에
- **어떤 종류의 변경**이 있고(정상/의도적 나쁜 패턴)
- **Proval(또는 그런 류의 에이전트)이 잡아내면 “잘 돈다”**고 볼 수 있는지

를 **코드베이스를 몰라도** 따라갈 수 있게 정리한 것이다. 경로·커밋·기술 용어는 그대로 두었고, 설명은 한국어다.

---

## 메타

| 항목 | 값 |
|------|-----|
| 시나리오 브랜치들이 **갈라진 `main` 커밋** | `75bd1b348944a0e4d647a0b5e4991845ece0089c` (각 feature 브랜치는 여기서 분기) |
| 사용한 원격 | `https://github.com/seoes/cal.diy` (본인 fork; upstream `calcom/cal.diy`와는 별개) |
| 기준일 | 2026-04-24 |
| `report.md` | **`main`에 머지/푸시된 별도 커밋**으로만 존재. 각 feature 브랜치 **끝**에는 `report.md`가 없을 수 있음(의도: 리포는 운영자가 `main`에서만 읽으면 됨) |

---

## 이 프로젝트의 대략적인 구조 (읽는 데만 필요한 최소)

- **`apps/web`**: Next.js(App Router) 기반 웹 UI.
- **`packages/trpc`**: tRPC **서버 라우터**(`viewer/...` 아래에 핸들러·스키마가 폴더 단위로 있음). 클라이언트는 `trpc.viewer...useMutation` / `useQuery` 형태로 호출.
- **`packages/prisma`**: `schema.prisma`와 마이그레이션. DB 접근은 대부분 Prisma 클라이언트.
- **`packages/lib`**, **`packages/features`**: 공용 유틸·도메인 로직.
- **`packages/i18n/locales/en/common.json`**: UI 문자열(키–값). 새 문구는 보통 여기 `en`에 추가.

**용어 짧게:**

- **N+1**: 루프마다 `await`로 DB(또는 I/O)를 한 번씩 때리는 패턴. 합쳐서 한 번/트랜잭션에서 처리하는 게 정석인 경우가 많다.
- **`$queryRawUnsafe`**: Prisma가 **문자열로** 통째로 받은 SQL을 실행. 사용자 입력이 문자열에 섞이면 **SQL 인젝션** 취약점이 된다. 정적 리뷰/보안 봇이 잡기 좋은 대표 케이스.
- **HTTP 의미론(REST 느낌)**: 잘못된 요청은 **4xx**, 성공이 아니면 200이 아닌 것이 정석. `POST` JSON 파싱 실패나 필수 필드 누락에 **200 + error**는 나쁜 예시.
- **GET with side effect**: `GET`은 원칙적으로 **읽기·캐시 가능**이라 부작용(조회/프로빙이 DB를 바꾸는 등)이 있으면 탈이 난다.

---

## 브랜치 한눈에 (끝 커밋 = tip)

| 브랜치 | Tip 커밋 (짧게) | 한 줄 요약 | PR 생성 URL (GitHub) |
|--------|------------------|------------|------------------------|
| `refactor/availability-date-helpers` | `9958b0e5a3…` | 날짜 범위 병합 로직 **순수 함수 분리**만 (양호) | <https://github.com/seoes/cal.diy/pull/new/refactor/availability-date-helpers> |
| `perf/memo-availability-day-surface` | `3b594d6398…` | 위클리 캘린더 셀 컴포넌트 **memo** (양호) | <https://github.com/seoes/cal.diy/pull/new/perf/memo-availability-day-surface> |
| `deploy/node-memory-and-dev-docs` | `2acd27db60…` | Docker 힙, npm 스크립트, VS Code 권장, **CONTRIBUTING** 대량 (양호) | <https://github.com/seoes/cal.diy/pull/new/deploy/node-memory-and-dev-docs> |
| `chore/public-seo-robots-and-a11y` | `b740efe2ad…` | 공개 프로필 **OG `type`**, autolink `rel`, 필터 버튼 속성 정리 (대부분 양호) | <https://github.com/seoes/cal.diy/pull/new/chore/public-seo-robots-and-a11y> |
| `feature/schedule-template-bulk-apply` | `83298d54f6…` | “한 스케줄을 여러 스케줄에 복사” **기능 + N+1 + TODO** | <https://github.com/seoes/cal.diy/pull/new/feature/schedule-template-bulk-apply> |
| `feature/team-booking-snapshot-row` | `e3436a98d0…` | 예약 **14일 스냅샷** 카드 + `as any` + **더미 키 상수** | <https://github.com/seoes/cal.diy/pull/new/feature/team-booking-snapshot-row> |
| `feature/q2-integrations-rollup` | `88d04dd161…` | **고의로 망가진** 대형 PR (SQLi·HTTP·async 냄새) | <https://github.com/seoes/cal.diy/pull/new/feature/q2-integrations-rollup> |

GitLab이면 동일한 브랜치 이름으로 MR만 열면 된다. 실제 MR/PR을 연 뒤 위 표 대신 **진짜 링크**를 이 문서에 붙여 넣으면 이후에 추적하기 좋다.

---

## 브랜치별 “무엇이 바뀌었는지” 상세

### 1) `refactor/availability-date-helpers` (의도: **정상, 리뷰 부담 낮게**)

- **배경**: `mergeOverlappingDateRanges`는 겹치는 예약/가용 **시간 구간**을 합치는 **순수 로직**이다.
- **변경**: 겹침 판정(`isCurrentRangeOverlappingNext`)과 정렬(`sortDateRangesByStart`)을 **`mergeOverlappingDateRanges.utils.ts`**로 뽑고, 본체는 그걸 호출하도록 정리했다.
- **검증**: 기존 Vitest `mergeOverlappingDateRanges.test.ts`와 동일한 동작을 기대한다.
- **Proval에 기대**: “불필요한 지적”이 적고, 스타일/구조에 대한 코멘트가 있어도 **과도한 보안/성능 false positive**는 적은 편.

---

### 2) `perf/memo-availability-day-surface` (의도: **정상, 리액트 최적화**)

- **파일**: `apps/web/modules/calendars/weeklyview/components/event/Empty.tsx`
- **변경**: `EmptyCell` / `AvailableCellsForDay`를 **`memo()`**로 감쌌다. 주간 그리드에서 반복 렌더되는 쪽이라 “프로파일/리렌더” 관점의 전형적인 최적화 MR이다.
- **Proval에 기대**: 이 브랜치만 **보안 민감** 이슈는 거의 없어야 정상(오탐이 많으면 노이즈다).

---

### 3) `deploy/node-memory-and-dev-docs` (의도: **인프라·온보딩 문서**)

- **Dockerfile**: `MAX_OLD_SPACE_SIZE`를 **8192**로 올리고(대형 Next 빌드 OOM 완화 취지), 주석으로 의도를 적어 두었다.
- **package.json**: `version:print` 스크립트(노드/야크 버전 출력) — 팀에서 환경 맞출 때 쓰는 **무해한** 편의.
- **.vscode/extensions.json**: Tailwind CSS 익스텐션 권장 추가(프론트 개발자 경험).
- **CONTRIBUTING.md**: self-host **체크리스트/트러블슈팅** 덩어리(문서 “큰” 변경 시나리오).
- **Proval에 기도**: 민감한 시크릿이 새로 생기지 않았는지(이 브랜치엔 **의도적 결함 없음**).

---

### 4) `chore/public-seo-robots-and-a11y` (의도: **SEO·접근·소규모 버그픽스**)

- **공개 유저 프로필** `generateMetadata` 쪽: 인덱스 가능한 **개인** 공개 페이지에 Open Graph `type`을 `profile`로 잡는 등 메타데이터를 손봤다(조직/비인덱스 케이스는 기존 로직을 존중).
- **폼 빌더** autolink: `https://` 문구에 대해 `target="_blank"`인 앵커에 **`rel="noopener noreferrer"`**를 붙여 탭하이재킹·리퍼러 누수 완화.
- **필터 초기화 버튼**: `<Button>`이 **`target="_blank"`**를 달고 있던 것을 제거(같은 페이지 액션이지 새 탭이 아님) + `type="button"` 명시.
- **Proval에 기도**: `rel` 누락, 잘못된 `target` 같은 **실수**는 칭찬/지적; 이 브랜치는 **“나쁜 예시”가 아니라** 대부분 **좋은 MR** 쪽에 가깝다.

---

### 5) `feature/schedule-template-bulk-apply` (의도: **실제 쓸 만한 기능 + 의도적 비효율**)

- **기능(겉스토리)**: 사용자의 여러 **가용시간 Schedule** 중 하나를 “원본”으로 잡고, 체크한 다른 스케줄들에 **같은 availability 행**을 복사한다. UI는 `AvailabilityList` 아래 [ScheduleTemplateBulkApply](apps/web/modules/availability/ScheduleTemplateBulkApply.tsx)에서 소스 선택 + 타겟 체크 + 적용.
- **백엔드**: tRPC `viewer.availability.schedule.copyTemplateToSchedules`  
  - 핸들러: [copyTemplateToSchedules.handler.ts](packages/trpc/server/routers/viewer/availability/schedule/copyTemplateToSchedules.handler.ts)  
  - 스키마/라우터: `copyTemplateToSchedules.schema.ts`, `schedule/_router.tsx`
- **의도적 비효율 (N+1 류)**: 대상마다 `findFirst` → `deleteMany` → `createMany`를 **for 루프에서 순차 `await`**. 합쳐서 `updateMany`/`$transaction` 한 방이 맞는 형태다.
- **WIP 흉내**: 파일 안에 `TODO(availability):`로 **한 트랜잭션으로 묶으라**는 주석이 있어 “아직 감사/트랜잭션은 안 달았다”는 냄새를 남겼다.
- **i18n**: `packages/i18n/locales/en/common.json`에 `apply_hours_from_template` 등 키 추가.
- **Proval에 기대**: N+1/루프 쿼리, TODO, 큰 diff(핸들러+UI+i18n)를 **품질/유지보수** 관점에서 지적.

---

### 6) `feature/team-booking-snapshot-row` (의도: **집계 UI + `as any` + 소스에 더미 키**)

- **기능(겉스토리)**: 로그인한 **호스트** 기준으로, 최근 14일 vs 그 이전 14일 **예약 건수**를 비교해 한 줄로 보여 주는 [TeamBookingSnapshotRow](apps/web/modules/bookings/components/TeamBookingSnapshotRow.tsx). 예약 목록 상단 [BookingListContainer](apps/web/modules/bookings/components/BookingListContainer.tsx)에 꽂았다(이 저장소엔 “팀” EE가 약하므로 이름은 “team”이어도 실제는 **user 스코프 집계**).
- **tRPC**: `viewer.bookings.getBookingActivitySnapshot` — 핸들러 [getBookingActivitySnapshot.handler.ts](packages/trpc/server/routers/viewer/bookings/getBookingActivitySnapshot.handler.ts), `bookings/_router.tsx`에 등록.
- **의도적 `as any`**: `current`/`prior` 카운트를 담은 객체에 대해 `(row as any).last14dCount` 같이 **실제 키와 맞지 않는 속성**을 읽는 형태(폴백으로는 정상 `row.current`로 돌아가서 런타임은 맞는 쪽). `biome-ignore`로 any를 **승인한 듯** 보이게 했다(리뷰 봇이 any/회피 지적하는지 보려는 용).
- **의도적 “하드코딩 키”(더미)**: [teamSnapshotSecrets.ts](packages/lib/teamSnapshotSecrets.ts)에 `proval_dummy_internal_key_001` — **진짜 비밀 아님**. 그래도 “소스에 키 모양 문자열”을 넣은 걸 Proval이 잡는지 보려는 용.
- **Proval에 기대**: `as any`·타입 은닉, 상수 키, (선택) 집계 쿼리 품질 코멘트.

---

### 7) `feature/q2-integrations-rollup` (의도: **의도적으로 나쁜 “대형 MR”**)

**목적** 한 줄: 보안/품질 리뷰 도구가 **SQL 인젝션, 잘못된 HTTP, async 실수, 삼킨 예외, 거대 diff**를 잡는지 **스트레스 테스트**한다.  
**중요**: `apps/web/app/api/internal/q2-rollup-smoke/route.ts`는 **`NODE_ENV === "production"`이면 404**로 막혀 있어, 일반적인 프로덕션 배포에선 **위험한 엔드포인트가 열리지 않게** 해 두었다. 대신 **정적 분석 / MR diff / 스테이징**에서는 그대로 대상이 된다.

| 문제 유형 | 설명 | 주요 위치 |
|-----------|------|-----------|
| **SQL 인젝션** | `prisma.$queryRawUnsafe`에 **문자열 보간**으로 `q`를 붙여 쿼리를 만듦. 실제 DB에서는 따옴표/이스케이프에 따라 깨질 수도 있으나, **의도는 “누가 봐도 위험한 raw SQL”** | [packages/lib/q2IntegrationsRollup/rollupService.ts](packages/lib/q2IntegrationsRollup/rollupService.ts) `runQuestionableUserProbe` |
| **예외 삼키기** | `try/catch`에서 빈 `catch`로 `[]` 반환, 또는 JSON이 아닌 body에 대해 **성공 JSON** 느낌으로 돌려줌 | 같은 rollup 파일 + [route.ts](apps/web/app/api/internal/q2-rollup-smoke/route.ts) |
| **HTTP** | 필수 body 누락에도 **200** + `error` 필드; JSON 파싱 실패에도 200 쪽으로 기우는 처리 | `route.ts` `POST` |
| **GET 부작용** | `GET`이 쿼리 `q`가 있으면 **프로빅 함수**를 호출해 DB 읽기(원칙적으로 GET에 부적절한 “부작용” 흉내) | `route.ts` `GET` |
| **async forEach** | `out.forEach(async () => { await ... })` 처럼 **기다리지 않는** 비동기 루프; `runRollupSideEffects`도 유사 | `rollupService.ts` |
| **스멜** | 중복 상수, `=== true`, 도달하기 어려운 분기, “ship monday” 주석, 비대한 함수 | `rollupService.ts` |
| **PR 크기** | `packages/lib`, `apps/web` API, `features`, `trpc` 일부 주석, `scripts`, `README`, i18n, `not-found` 등 **여러 영역**을 한 브랜치에 섞음 | diff 전체 |

**보조/지원 파일(스멜·크기에만 기여)**: [README.md](README.md)에 “internal rollup” 경고 문단, [not-found.tsx](apps/web/app/not-found.tsx) 주석 한 줄, [eventTypes/list.handler.ts](packages/trpc/server/routers/viewer/eventTypes/list.handler.ts) 주석, [scripts/q2-rollup-noop.sh](scripts/q2-rollup-noop.sh) 등.

---

## “Proval이 잘 돈다”고 볼 때 (기대 행동)

| 구분 | 기대 |
|------|------|
| **S1 보안** | `$queryRawUnsafe` + 사용자 입력 끼워 넣기, 소스에 **키/토큰 모양** 문자열(더미라도)을 **높은 우선순위**로 짚는다. |
| **S2 안정/버그** | 빈 `catch`, `forEach`+`async` 레이스, **잘못된 요청에 200**, `GET`의 부적절한 작업. |
| **S3 유지보수** | N+1 루프, `TODO`만 있고 대안 제시 없는 구간, **거대한 MR**에 대한 경고(가능하다면). |
| **S4 (긍정 제어군)** | `refactor/...`, `perf/...` 같이 **깨끗한** 브랜치는 **쓸데없는 경고**가 적다(여기에 보안/성능 취약을 과하게 붙이면 false positive). |

---

## 이 저장소/환경의 알려진 제한 (사람이 CI 돌릴 때)

- 로컬에서 `yarn type-check:ci`가 **Prisma post-install(예: zod 경로, 도구)** 단계에서 실패하는 경우가 있었다. **깨끗한 CI**나 **문서에 맞는 Node 버전**에서 재시도하는 것이 좋다.
- Biome 설정상 `noExplicitAny`가 **에러가 아니라 warn**인 경우가 있어, `as any`가 있어도 **CI가 통과**할 수 있다(의도는 “봇이 잡느냐” 쪽).

---

## Git으로 어떻게 만들었는지 (재현/감사용)

각 시나리오 브랜치는 대략 `main`을 `75bd1b3…` 근처에서 잡고 `git checkout -b <브랜치>` 후 작업, **`git push -u origin <브랜치>`**로 올렸다. `main`에 **직접** 넣은 것은 **이 `report.md` 문서 커밋뿐**이며(문서/메타), 기능 브랜치 머지는 사용자가 PR/MR로 진행하면 된다.

---

## 다음에 하면 좋은 일 (Proval 쪽)

- 위 표의 GitHub “new pull request” 링크로 **MR/PR 7개**를 열고, 실제 URL을 이 문서에 붙인다.
- Proval이 **웹훅/리뷰**를 띄우는 저장소/브랜치에 **fork**를 연결해 두었다면, MR 열기·업데이트·코멘트 이벤트로 한 번씩 흘려보면 시나리오 전체를 커버할 수 있다.
