# Tasks: Custom Branding (Logo & Favicon)

**Input**: Design documents from `/specs/001-custom-branding/`  
**Prerequisites**: plan.md ✅, spec.md ✅

**Tests**: E2E tests included as part of user story validation

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Cal.com uses monorepo structure:

- **Web app**: `apps/web/` for Next.js application
- **Packages**: `packages/` for shared libraries
- **Tests**: `apps/web/playwright/` for E2E tests

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare feature branch and test assets

- [x] T001 Verify feature branch `001-custom-branding` is checked out
- [x] T002 [P] Create test fixtures directory `apps/web/playwright/fixtures/branding/` with sample logo (PNG, 200KB) and favicon (ICO, 50KB)
- [x] T003 [P] Review existing `packages/lib/server/avatar.ts` to understand avatar upload pattern

**Checkpoint**: ✅ Branch ready, test assets prepared, avatar pattern understood

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Extend Zod schema for user metadata in `packages/prisma/zod-utils.ts` to include `businessLogo?: { objectKey: string; uploadedAt: string; originalFilename: string; }` and `favicon?: { objectKey: string; uploadedAt: string; originalFilename: string; }`
- [x] T005 [P] Add `uploadUserLogo(userId: number, data: string)` function to `packages/lib/server/avatar.ts` - stores logo with `teamId=-1, userId=X, isBanner=false`, handles old file deletion, returns `/api/avatar/[uuid].png` URL
- [x] T006 [P] Add `uploadUserFavicon(userId: number, data: string)` function to `packages/lib/server/avatar.ts` - stores favicon with `teamId=-1, userId=X, isBanner=true`, handles old file deletion, returns `/api/avatar/[uuid].png` URL
- [x] T007 Create `packages/trpc/server/routers/viewer/me/uploadLogo.handler.ts` - validates base64 input (max 5MB decoded), calls `uploadUserLogo()`, updates `user.metadata.businessLogo`, returns objectKey and URL
- [x] T008 Create `packages/trpc/server/routers/viewer/me/deleteLogo.handler.ts` - deletes Avatar record (teamId=-1, userId=X, isBanner=false), removes `user.metadata.businessLogo`, returns success status
- [x] T009 [P] Create `packages/trpc/server/routers/viewer/me/uploadFavicon.handler.ts` - validates base64 input (max 1MB decoded), calls `uploadUserFavicon()`, updates `user.metadata.favicon`, returns objectKey and URL
- [x] T010 [P] Create `packages/trpc/server/routers/viewer/me/deleteFavicon.handler.ts` - deletes Avatar record (teamId=-1, userId=X, isBanner=true), removes `user.metadata.favicon`, returns success status
- [x] T011 Register new tRPC mutations in `packages/trpc/server/routers/viewer/me/_router.tsx` - add `uploadLogo`, `deleteLogo`, `uploadFavicon`, `deleteFavicon` procedures

**Checkpoint**: ✅ Foundation ready - backend API functional, user stories can now be implemented

---

## Phase 3: User Story 1 - Upload and Display Business Logo (Priority: P1) 🎯 MVP

**Goal**: Users can upload a business logo via appearance settings and see it displayed centered at the top of their public booking page

**Independent Test**: User uploads logo from `/settings/my-account/appearance`, navigates to public booking page, sees logo centered at top

### Implementation for User Story 1

- [x] T012 [US1] Add logo upload section to `apps/web/modules/settings/my-account/appearance-view.tsx` - import `ImageUploader` component, add "Business Logo" section with file upload control (max 5MB, formats: PNG/JPG/SVG)
- [x] T013 [US1] Wire logo upload to tRPC mutation in `appearance-view.tsx` - use `trpc.viewer.me.uploadLogo.useMutation()`, handle success/error with toast notifications, show upload progress
- [x] T014 [US1] Add logo preview display in `appearance-view.tsx` - show uploaded logo using `/api/avatar/{objectKey}.png` if `user.metadata.businessLogo` exists
- [x] T015 [US1] Add "Delete Logo" button to `appearance-view.tsx` - wire to `trpc.viewer.me.deleteLogo.useMutation()`, show confirmation dialog, handle success/error
- [x] T016 [US1] Display logo on public user page in `apps/web/modules/users/views/users-public-view.tsx` - check if `user.metadata.businessLogo.objectKey` exists, render `<img src="/api/avatar/{objectKey}.png" alt="Business logo" className="max-w-[400px] max-h-[150px] mx-auto object-contain mb-6">` centered above existing content
- [x] T017 [US1] Display logo on event type booking page in `apps/web/modules/users/views/users-type-public-view.tsx` - check if user data includes `metadata.businessLogo.objectKey`, render logo with same styling as T016
- [x] T018 [US1] Add validation and error handling for logo uploads in `appearance-view.tsx` - validate file size (5MB max), validate format (PNG/JPG/SVG only), show clear error messages for validation failures

### E2E Tests for User Story 1

- [x] T019 [US1] Create E2E test file `apps/web/playwright/settings/upload-branding.e2e.ts` with test scaffold and user setup
- [x] T020 [P] [US1] Write E2E test "User can upload a business logo" - navigates to appearance settings, uploads logo file, verifies success toast, checks database for Avatar record
- [x] T021 [P] [US1] Write E2E test "Uploaded logo displays on public booking page" - uploads logo, navigates to public booking page, verifies logo image is visible and has correct src attribute
- [x] T022 [P] [US1] Write E2E test "User can replace existing logo" - uploads logo, uploads different logo, verifies new logo displays, verifies old Avatar record is deleted from database
- [x] T023 [P] [US1] Write E2E test "User can delete logo" - uploads logo, clicks delete button, confirms deletion, verifies logo removed from public page and database

**Checkpoint**: At this point, User Story 1 should be fully functional - users can upload, display, replace, and delete business logos

---

## Phase 4: User Story 2 - Upload and Apply Custom Favicon (Priority: P2)

**Goal**: Users can upload a custom favicon via appearance settings and see it applied to their public booking page browser tab

**Independent Test**: User uploads favicon from `/settings/my-account/appearance`, navigates to public booking page, sees custom favicon in browser tab

### Implementation for User Story 2

- [ ] T024 [US2] Add favicon upload section to `apps/web/modules/settings/my-account/appearance-view.tsx` - add "Favicon" section with `ImageUploader` component (max 1MB, formats: ICO/PNG), include recommendation text "Recommended: 32×32px minimum"
- [ ] T025 [US2] Wire favicon upload to tRPC mutation in `appearance-view.tsx` - use `trpc.viewer.me.uploadFavicon.useMutation()`, handle success/error with toast notifications, show upload progress
- [ ] T026 [US2] Add favicon preview display in `appearance-view.tsx` - show uploaded favicon using `/api/avatar/{objectKey}.png` if `user.metadata.favicon` exists, scale to 32×32px for preview
- [ ] T027 [US2] Add "Delete Favicon" button to `appearance-view.tsx` - wire to `trpc.viewer.me.deleteFavicon.useMutation()`, show confirmation dialog, handle success/error
- [ ] T028 [US2] Apply custom favicon to public user page in `apps/web/modules/users/views/users-public-view.tsx` - check if `user.metadata.favicon.objectKey` exists, inject `<link rel="icon" href="/api/avatar/{objectKey}.png">` using Next.js Head or metadata API
- [ ] T029 [US2] Apply custom favicon to event type booking page in `apps/web/modules/users/views/users-type-public-view.tsx` - same favicon injection logic as T028
- [ ] T030 [US2] Add validation and error handling for favicon uploads in `appearance-view.tsx` - validate file size (1MB max), validate format (ICO/PNG only), show clear error messages

### E2E Tests for User Story 2

- [ ] T031 [P] [US2] Write E2E test "User can upload a custom favicon" in `upload-branding.e2e.ts` - navigates to appearance settings, uploads favicon file, verifies success toast, checks database
- [ ] T032 [P] [US2] Write E2E test "Uploaded favicon displays in browser tab" - uploads favicon, navigates to public booking page, verifies `<link rel="icon">` has correct href attribute
- [ ] T033 [P] [US2] Write E2E test "User can replace existing favicon" - uploads favicon, uploads different favicon, verifies new favicon, verifies old Avatar record deleted
- [ ] T034 [P] [US2] Write E2E test "User can delete favicon" - uploads favicon, clicks delete button, confirms deletion, verifies default favicon restored

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users have complete branding control with logo and favicon

---

## Phase 5: User Story 3 - Responsive Logo Display (Priority: P3)

**Goal**: Business logos display properly scaled and centered on all device sizes (desktop, tablet, mobile) without distortion

**Independent Test**: User views their public booking page on different screen sizes (desktop 1920px, tablet 768px, mobile 375px) and confirms logo displays appropriately on all devices

### Implementation for User Story 3

- [ ] T035 [US3] Update logo styling in `apps/web/modules/users/views/users-public-view.tsx` - ensure responsive CSS with Tailwind classes: `max-w-[400px] md:max-w-[400px] sm:max-w-[300px] max-h-[150px] w-full object-contain mx-auto`
- [ ] T036 [US3] Update logo styling in `apps/web/modules/users/views/users-type-public-view.tsx` - apply same responsive CSS as T035
- [ ] T037 [US3] Add fallback handling for missing/invalid logo URLs - wrap logo `<img>` in error boundary or use `onError` handler to gracefully hide broken images
- [ ] T038 [US3] Test and adjust logo container width constraints - ensure parent container doesn't force horizontal scrolling on narrow devices (<400px width)

### Responsive Testing for User Story 3

- [ ] T039 [US3] Manual test: Logo displays correctly on desktop (1920×1080px viewport) - opens public page, verifies logo centered, scaled to max 400×150px, no distortion
- [ ] T040 [US3] Manual test: Logo displays correctly on tablet (768×1024px viewport) - verifies logo scales appropriately, remains centered, maintains aspect ratio
- [ ] T041 [US3] Manual test: Logo displays correctly on mobile (375×667px viewport) - verifies logo scales down to fit screen width, no horizontal scrolling, maintains aspect ratio
- [ ] T042 [US3] Manual test: Wide logo (10:1 aspect ratio) handles properly on mobile - uploads very wide logo, verifies it scales to screen width without horizontal scrolling

**Checkpoint**: All three user stories should now be independently functional - complete branding solution with responsive display

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, documentation, and quality assurance across all user stories

- [ ] T043 [P] Add JSDoc comments to all functions in `packages/lib/server/avatar.ts` - document `uploadUserLogo` and `uploadUserFavicon` functions with param types, return types, and behavior descriptions
- [ ] T044 [P] Add JSDoc comments to all tRPC handlers in `packages/trpc/server/routers/viewer/me/upload*.handler.ts` and `delete*.handler.ts` - document input validation, error conditions, return types
- [ ] T045 [P] Add inline comments explaining Avatar table repurposing strategy in `avatar.ts` - comment on why `isBanner` field distinguishes logo (false) vs favicon (true)
- [ ] T046 Add inline help text to logo upload section in `appearance-view.tsx` - add tooltip or helper text: "Your logo will display centered at the top of your booking page (max 400×150px)"
- [ ] T047 Add inline help text to favicon upload section in `appearance-view.tsx` - add tooltip: "Favicon appears in browser tabs. Recommended: 32×32px minimum, ICO or PNG format"
- [ ] T048 [P] Write edge case test "Upload file exceeds size limit" in `upload-branding.e2e.ts` - attempts to upload 6MB logo, verifies error message, upload blocked
- [ ] T049 [P] Write edge case test "Upload unsupported file format" in `upload-branding.e2e.ts` - attempts to upload BMP file, verifies error message, upload blocked
- [ ] T050 Add error boundary or fallback for invalid image URLs - handle case where Avatar record deleted but metadata still references objectKey
- [ ] T051 Run full test suite and verify all E2E tests pass - execute `yarn playwright test upload-branding.e2e.ts` and confirm 100% pass rate
- [ ] T052 Run linter and fix any code style issues - execute `yarn lint:fix` on all modified files
- [ ] T053 Code review: Verify constitution compliance - check that code follows readability, beginner-friendly documentation, file consolidation, and comprehensive comments principles
- [ ] T054 Update feature status to "Complete" in `specs/001-custom-branding/spec.md` - change status from "Draft" to "Implemented"

**Checkpoint**: Feature is production-ready with complete documentation and test coverage

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) completion - can run in parallel with US1
- **User Story 3 (Phase 5)**: Depends on US1 completion (needs logo display implemented) - can run in parallel with US2
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - **No dependencies** on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - **Independent** of US1 (different API endpoints and UI sections)
- **User Story 3 (P3)**: Requires US1 logo display to be implemented (T016-T017) - **Depends on** US1 tasks T012-T018

### Within Each User Story

- Backend handlers (T007-T010) must complete before frontend UI (T012-T015, T024-T027)
- Frontend UI must complete before public display (T016-T017, T028-T029)
- Implementation must complete before E2E tests are executed (not written)
- Validation tasks can happen in parallel with core implementation

### Parallel Opportunities

#### Phase 2 (Foundational)

- T005 and T006 (avatar functions) can run in parallel
- T007-T010 (all four tRPC handlers) can be created in parallel after T004-T006 complete
- T009 and T010 (favicon handlers) can run in parallel with T007-T008 (logo handlers)

#### Phase 3 (User Story 1)

- T020-T023 (E2E test writing) can run in parallel - write all logo tests together
- T012-T015 (UI implementation) should be sequential in same file but could be worked on by same developer in one session

#### Phase 4 (User Story 2) - **Can run FULLY in parallel with Phase 3**

- T024-T030 (favicon implementation) uses different API endpoints and UI sections than logo
- T031-T034 (E2E test writing) can run in parallel
- Entire US2 can proceed simultaneously with US1 if two developers available

#### Phase 5 (User Story 3)

- T035-T038 (styling updates) touch different aspects, can be done together
- T039-T042 (manual responsive testing) can be done in one testing session across all viewports

#### Phase 6 (Polish)

- T043-T045 (JSDoc comments) can all run in parallel - different files
- T046-T047 (help text) can run in parallel - different UI sections
- T048-T049 (edge case tests) can be written in parallel
- T052-T053 (linting, review) can run in parallel

---

## Parallel Example: Complete Feature with Two Developers

### Developer A focuses on Logo (US1):

```bash
# After Phase 2 completes, Developer A works on:
T012-T018: Logo UI and display implementation
T020-T023: Logo E2E tests (write in parallel)
T035-T038: Logo responsive styling
T039-T042: Logo responsive testing
```

### Developer B focuses on Favicon (US2):

```bash
# After Phase 2 completes, Developer B works in parallel on:
T024-T030: Favicon UI and display implementation
T031-T034: Favicon E2E tests (write in parallel)
# Then joins Developer A on Polish tasks
```

### Both developers collaborate on:

```bash
# Phase 2 foundation (sequential within phase, but small):
T004-T011: All backend infrastructure together

# Phase 6 polish (all parallel):
T043-T053: Documentation, edge cases, quality checks
```

**Timeline estimate with parallel work**:

- Phase 1: 30 min (setup)
- Phase 2: 3-4 hours (foundation - sequential)
- Phases 3-5: 4-6 hours (with 2 developers in parallel)
- Phase 6: 2-3 hours (polish - mostly parallel)
- **Total: 10-14 hours with 2 developers** vs 15-20 hours with 1 developer

---

## Implementation Strategy

### MVP First (User Story 1 Only)

For fastest time-to-value, implement only business logo feature:

1. Complete Phase 1: Setup (30 min)
2. Complete Phase 2: Foundational (3-4 hours)
3. Complete Phase 3: User Story 1 only (4-5 hours)
   - Skip US2 (favicon) and US3 (responsive) for now
4. **STOP and VALIDATE**: Test logo upload and display
5. Deploy/demo minimal viable branding feature
6. Add US2 and US3 in subsequent iterations if needed

**MVP delivers**: Users can upload and display business logos on booking pages

### Incremental Delivery (Recommended)

For balanced feature completeness:

1. Complete Setup + Foundational (4 hours) → Foundation ready
2. Add User Story 1 → Test independently → **Demo checkpoint** (MVP with logo!)
3. Add User Story 2 in parallel or next → Test independently → **Demo checkpoint** (complete branding!)
4. Add User Story 3 → Test independently → **Demo checkpoint** (responsive polish!)
5. Polish phase → Final quality pass → **Production ready**

Each checkpoint delivers testable, demoable value.

### Parallel Team Strategy

With two developers available:

1. **Together**: Complete Setup + Foundational (Phase 1-2)
2. **Split work** after Phase 2:
   - **Developer A**: User Story 1 (logo) - T012-T023, T035-T042
   - **Developer B**: User Story 2 (favicon) - T024-T034
3. **Merge and test**: Both stories should work independently
4. **Together**: Polish phase (T043-T054)

This approach delivers both features in similar time to sequential US1-only approach.

---

## Notes

- **[P] tasks** = Can run in parallel (different files, no overlapping changes)
- **[Story] labels** = Map each task to its user story for traceability
- **File consolidation**: Most changes concentrated in 3 main files (avatar.ts, appearance-view.tsx, public views)
- **Constitution compliance**: All tasks include commenting and documentation requirements
- **Test strategy**: E2E tests validate each user story independently
- **Checkpoints**: After each phase, validate the story works before proceeding
- **Commit strategy**: Commit after completing each task group (e.g., all Phase 2 backend, all Phase 3 UI)

**Avoid**:

- Vague tasks like "Add branding feature" - all tasks have specific file paths and descriptions
- Same-file conflicts - when tasks touch same file (like appearance-view.tsx), they're sequential
- Cross-story dependencies - US1 and US2 are independent (different APIs, UI sections)

**Ready to implement**: All 54 tasks are concrete, actionable, and can begin execution immediately after plan approval.
