# Proval MR(merge request) 요청문 예시

이 파일은 **GitHub PR 또는 GitLab MR을 열 때** 본문에 붙여 넣을 **예시 텍스트**다. Proval(또는 이와 비슷한 리뷰 에이전트)이 MR 설명·코멘트·웹훅 payload와 함께 읽을 수 있게, **구조화된 메타**를 브랜치마다 넣어 두었다.

**사용법**

- 아래 각 섹션의 **「MR 본문에 붙여넣기」** 블록을 복사해 해당 브랜치로 PR/MR을 열 때 설명에 넣는다.
- (선택) Proval이 YAML/JSON을 지원한다면, 같은 섹션의 **`proval_meta`** 코드블록을 그대로 보존하면 에이전트가 `ground_truth`·`expected_signals`로 구분하는 데 유리하다.
- `BASE_SHA`·`FORK`는 [report.md](report.md) 기준. fork URL은 본인 환경에 맞게 바꾼다.

```yaml
# 전역 (모든 MR에 공통으로 알려주고 싶을 때 상단에 한 번)
repository_context:
  name: cal.diy
  monorepo: true
  stack_hint: "Next.js App Router, Prisma, tRPC, React"
  test_fixture: true
  human_owner_note: "제품이 아닌 Proval 스트레스/픽스처용 fork일 수 있음"
base_main_sha: "75bd1b348944a0e4d647a0b5e4991845ece0089c"
```

---

## 1) `refactor/availability-date-helpers`

### MR 제목 (예시)

```
refactor(availability): extract merge-overlap date range helpers
```

### MR 본문에 붙여넣기

```markdown
## 요약
`mergeOverlappingDateRanges`에서 정렬·겹침 판정 로직을 `mergeOverlappingDateRanges.utils.ts`로 분리해 가독성을 높였다. 동작은 기존 Vitest(`mergeOverlappingDateRanges.test.ts`)와 동일하게 유지한다.

## 변경 범위
- `packages/features/availability/.../mergeOverlappingDateRanges.ts`
- `packages/features/availability/.../mergeOverlappingDateRanges.utils.ts` (신규)

## 체크리스트
- [ ] 단위 테스트 통과(해당 파일 관련)
- [ ] 이 MR은 **보안/시크릿** 변경 없음(리팩터 전용)
```

```yaml
# proval_meta (에이전트용)
branch: refactor/availability-date-helpers
scenario_type: clean_positive
ground_truth:
  security_defect: false
  performance_regression: false
  intentional_bad_patterns: []
expected_agent_behavior:
  severity: low
  should_flag: ["style", "optional: export API surface if any"]
  should_not_flag_heavy: ["sql_injection", "hardcoded_secrets", "n_plus_1"]  # 이 브랜치엔 없음
review_priority: P3
```

---

## 2) `perf/memo-availability-day-surface`

### MR 제목 (예시)

```
perf(web): memoize weekly calendar empty/day cells
```

### MR 본문에 붙여넣기

```markdown
## 요약
주간 캘린더 뷰(`Empty.tsx`)에서 `EmptyCell`·`AvailableCellsForDay`를 `React.memo`로 감싸 불필요한 리렌더를 줄인다.

## 변경 범위
- `apps/web/modules/calendars/weeklyview/components/event/Empty.tsx`

## 주의
- 동일 props에 대한 메모 효과 검증은 스냅샷/E2E 범위 밖이면 런타임 눈으로만 확인.
```

```yaml
# proval_meta
branch: perf/memo-availability-day-surface
scenario_type: clean_positive
ground_truth:
  security_defect: false
  intentional_bad_patterns: []
expected_agent_behavior:
  should_mention: ["react.memo", "re-render", "optional: dependency stability"]
  false_positive_risk: "낮을수록 좋음 — 보안 이슈는 기대하지 않음"
```

---

## 3) `deploy/node-memory-and-dev-docs`

### MR 제목 (예시)

```
chore: docker heap for build, version script, CONTRIBUTING self-host section
```

### MR 본문에 붙여넣기

```markdown
## 요약
- Docker 빌드 시 Node 힙 기본값 상향(대형 monorepo Next 빌드 OOM緩和).
- `package.json`에 `version:print` 스크립트 추가.
- `.vscode/extensions.json`에 Tailwind 권장 확장.
- `CONTRIBUTING.md`에 self-host 운영자용 트러블슈팅/체크리스트 섹션 추가.

## 운영/보안
- **새 시크릿/키/토큰은 커밋하지 않음.**
- 문서·Docker 인자는 공개되어도 되는 범주만.
```

```yaml
# proval_meta
branch: deploy/node-memory-and-dev-docs
scenario_type: clean_positive_infra_docs
ground_truth:
  hardcoded_secrets: false
  intentional_bad_patterns: []
expected_agent_behavior:
  should_scan: ["Dockerfile for accidental ARG secret", "doc for misleading ops advice"]
  note: "문서/인프라 MR — 코드 스멜은 적고, ‘민감 정보 유출’이 없어야 정상"
```

---

## 4) `chore/public-seo-robots-and-a11y`

### MR 제목 (예시)

```
chore: public profile OG, form autolink rel, clear-filters button semantics
```

### MR 본문에 붙여넣기

```markdown
## 요약
- 공개 유저 프로필 메타데이터: 인덱스되는 개인 페이지에 `openGraph.type: profile` 등 메타 정리.
- 폼 빌더에서 `https://` 자동 링크에 `rel=noopener noreferrer` + `target=_blank` 조합.
- 데이터 테이블 “필터 지우기” 버튼에서 잘못 붙은 `target=_blank` 제거 및 `type=button` 명시.

## 접근성/보안(링크)
- `rel` 누락·잘못된 `target`은 여기서 **수정**한 쪽이다(악의적 샘플이 아님).
```

```yaml
# proval_meta
branch: chore/public-seo-robots-and-a11y
scenario_type: mostly_clean_positive
ground_truth:
  security_defect: false
  includes_fixes_for: ["missing rel on external autolink", "wrong target on in-page button"]
intentional_bad_patterns: []  # 이 MR은 “나쁜 예시”가 아님. 긍정·소규모 픽스 위주.
expected_agent_behavior:
  may_acknowledge: ["good a11y fix", "og metadata"]
  should_not: ["treat as sql injection or secret leak for this diff"]
```

---

## 5) `feature/schedule-template-bulk-apply`

### MR 제목 (예시)

```
feat(availability): copy one schedule’s hours to other schedules
```

### MR 본문에 붙여넣기

```markdown
## 요약
한 사용자의 “원본” 가용시간(Schedule)에 연결된 availability 행을, 선택한 여러 대상 Schedule에 **덮어써** 동일한 근무시간을 적용한다. Web UI + tRPC + i18n.

## 기술
- tRPC: `viewer.availability.schedule.copyTemplateToSchedules`
- UI: `ScheduleTemplateBulkApply` (availability 목록 하단)

## 리뷰에 부탁
- **트랜잭션/배치** 관점: 대상마다 `await` 루프로 DB를 여러 번 두드리는 데, 운영 부하/잠금에 대한 의견이 있으면 환영.
- i18n 키(`en/common.json`) 누락/키 이름 일관성.
```

```yaml
# proval_meta — 이 브랜치는 “의도적 품질 냄새” 포함
branch: feature/schedule-template-bulk-apply
scenario_type: feature_with_intentional_smells
ground_truth:
  intentional_patterns:
    - name: n_plus_1_sequential_awaits
      location_hint: "packages/trpc/.../copyTemplateToSchedules.handler.ts (loop with findFirst/deleteMany/createMany)"
    - name: todo_follow_up_transaction
      location_hint: "same file — TODO(availability) about $transaction"
  security_defect: false
  secret_leak: false
expected_agent_behavior:
  should_flag: ["N+1 or batched write suggestion", "transaction boundary", "TODO follow-up", "i18n coverage"]
  severity_expected: "medium (maintainability/perf), not critical security"
```

---

## 6) `feature/team-booking-snapshot-row`

### MR 제목 (예시)

```
feat(bookings): 14d host activity snapshot on bookings list
```

### MR 본문에 붙여넣기

```markdown
## 요약
호스트(로그인 사용자) 기준 최근 14일 vs 이전 14일 예약 건수를 한 줄로 보여 주는 스냅샷. 예약 목록 상단에 배치.

## 기술
- tRPC: `viewer.bookings.getBookingActivitySnapshot`
- `packages/lib/teamSnapshotSecrets.ts` — **이름은 CRON/내부 키지만 값은 Proval용 더미 문자열(실 키 아님).**

## 리뷰 포인트
- 집계 쿼리 조건(취소 제외, user scope)이 제품 기대와 맞는지.
- 타입 단언(`as any` 등)이 있다면 **의도/대안**을 짚어 주면 감사.
```

```yaml
# proval_meta
branch: feature/team-booking-snapshot-row
scenario_type: feature_with_intentional_lint_and_dummy_secret
ground_truth:
  intentional_patterns:
    - name: as_any_on_row
      location_hint: "getBookingActivitySnapshot.handler.ts (biome-ignore near row mapping)"
    - name: dummy_key_constant
      location: "packages/lib/teamSnapshotSecrets.ts"
      value_is_fake: true
      fake_value: "proval_dummy_internal_key_001"
  security_defect: "dummy_key_in_source_still_smells; not production secret"
expected_agent_behavior:
  should_flag: ["as any or unsafe typing", "hardcoded key-like string in repo (even if placeholder)"]
  must_not: ["assume the dummy key is a real rotation-needed credential without reading file"]
```

---

## 7) `feature/q2-integrations-rollup`

### MR 제목 (예시)

```
feat: Q2 internal integration rollup (internal API + lib helpers)
```

### MR 본문에 붙여넣기

```markdown
## 요약
Q2 내부 통합 롤업용 **스모크/실험** 코드. `packages/lib/q2IntegrationsRollup/`, `app/api/internal/q2-rollup-smoke/`, README·문서·부가 스크립트를 한 PR에 묶었다.

## 중요(운영)
- `app/api/internal/q2-rollup-smoke/route`는 **`NODE_ENV=production`에서 404**로 비활성화. 스테이징/로컬·정적 리뷰용.

## 정직한 고지(리뷰어·봇용)
- 이 PR은 **故의적으로** 취약/스멜이 들어가 있다(스트레스 테스트). 머지 전에 **전부** 제거하거나 가드/파라미터화할 것.
- 샘플: `prisma.$queryRawUnsafe` + 문자열 보간, 잘못된 HTTP status, `forEach`+async, 빈 catch 등.

## 머지 권고
- **Proval/테스트 끝날 때까지 draft** 권장. 제품 `main` 정채와 맞지 않을 수 있음.
```

```yaml
# proval_meta — 스트레스/네거티브 시나리오
branch: feature/q2-integrations-rollup
scenario_type: stress_negative_intentional
ground_truth:
  intentional_vulnerabilities_and_smells: true
  not_for_production_merge_as_is: true
  production_guard: "api route returns 404 when NODE_ENV=production"
  patterns_to_detect:
    - "prisma.$queryRawUnsafe with user-controlled string in SQL (SQLi class)"
    - "POST returns 200 for validation error"
    - "GET with side effects (probe)"
    - "empty or swallowing catch"
    - "forEach(async) without await"
    - "large cross-cutting diff (many packages)"
  primary_files:
    - "packages/lib/q2IntegrationsRollup/rollupService.ts"
    - "apps/web/app/api/internal/q2-rollup-smoke/route.ts"
expected_agent_behavior:
  must_flag: ["$queryRawUnsafe", "string interpolation in SQL", "200 on client error", "async forEach fire-and-forget"]
  severity_expected: "high for security/HTTP misuse in diff (ignore only if explictly disabled in prod and clearly documented — still flag in review)"
  false_negative_tolerance: "low — missing flags on this MR suggests agent gap"
```

---

## Proval이 문서 읽는 순서 (권장)

1. `report.md` — 전체 맥락·브랜치 요약
2. **해당 MR의 본문** + 위 `proval_meta` — 이번 diff의 `ground_truth`
3. **Diff / 파일** — `expected_agent_behavior`와 교차 검증

## 라벨 예시 (GitHub / GitLab)

| 브랜치 | 제안 라벨 |
|--------|-----------|
| 1, 2, 3, 4 | `proval:control-positive` 또는 `review:low-noise-expected` |
| 5 | `proval:perf-smell` |
| 6 | `proval:typing-secret-smell` |
| 7 | `proval:stress-negative` `do-not-merge-without-rewrite` |

(실제로 라벨이 없으면 본문 상단에 `Labels: ...` 한 줄로만 써도 됨.)
