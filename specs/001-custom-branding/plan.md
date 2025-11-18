# Implementation Plan: Custom Branding (Logo & Favicon)

**Branch**: `001-custom-branding` | **Date**: 2025-11-18 | **Spec**: [spec.md](./spec.md)

## Summary

Add business logo and custom favicon upload capabilities to Cal.com's appearance settings, allowing users to brand their public booking pages. Users will upload images via `/settings/my-account/appearance`, and the logo will display centered at the top of their public booking page while the custom favicon appears in browser tabs.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+  
**Primary Dependencies**: Next.js 14 (App Router), tRPC, React 18, Prisma (PostgreSQL), Tailwind CSS 3  
**Storage**: PostgreSQL database (existing Avatar table for image storage as base64)  
**Testing**: Playwright for E2E tests, existing test infrastructure  
**Target Platform**: Web (self-hosted Cal.com instance)  
**Project Type**: Web application with frontend (React) and backend (Next.js API routes + tRPC)  
**Performance Goals**: Upload completion <30s, image display <5s, 99% upload success rate  
**Constraints**: 5MB logo limit, 1MB favicon limit, public URLs with obscured paths (UUID-based)  
**Scale/Scope**: Single-user feature, ~1K-10K users, images stored as base64 in database

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### ✅ Code Readability & Simplicity

- Reuse existing `ImageUploader` component and `Avatar` table pattern
- Follow Cal.com's established upload patterns (avatar, team logo)
- Single-file modifications where possible (appearance-view.tsx, tRPC router)

### ✅ Beginner-Friendly Documentation

- Inline comments explaining logo/favicon storage approach
- JSDoc for new tRPC procedures
- Comments explaining UUID generation for security

### ✅ File Consolidation

- Logo upload logic consolidated in one tRPC mutation
- Appearance UI changes in single view file
- Reuse existing components (ImageUploader, API route pattern)

### ✅ Comprehensive Comments

- Document why Avatar table is reused (existing pattern)
- Explain metadata structure for logo/favicon tracking
- Comment on security approach (UUIDs for obscured paths)

## Project Structure

### Documentation (this feature)

```text
specs/001-custom-branding/
├── plan.md              # This file
├── spec.md              # Feature specification
└── checklists/
    └── requirements.md  # Quality validation checklist
```

### Source Code (repository root)

**Web Application Structure:**

```text
apps/web/
├── modules/settings/my-account/
│   └── appearance-view.tsx                    # [MODIFY] Add logo/favicon upload UI
├── modules/users/views/
│   ├── users-public-view.tsx                  # [MODIFY] Display logo on public page
│   └── users-type-public-view.tsx             # [MODIFY] Display logo on booking page
├── app/
│   ├── (use-page-wrapper)/settings/(settings-layout)/my-account/appearance/
│   │   └── page.tsx                           # [NO CHANGE] Server component
│   └── api/avatar/[uuid]/
│       └── route.ts                           # [NO CHANGE] Already serves logos

packages/
├── trpc/server/routers/viewer/me/
│   ├── uploadLogo.handler.ts                  # [CREATE] Logo upload mutation
│   ├── deleteLogo.handler.ts                  # [CREATE] Logo deletion mutation
│   ├── uploadFavicon.handler.ts               # [CREATE] Favicon upload mutation
│   ├── deleteFavicon.handler.ts               # [CREATE] Favicon deletion mutation
│   └── _router.tsx                            # [MODIFY] Add new mutations
├── lib/server/
│   └── avatar.ts                              # [MODIFY] Add uploadUserLogo and uploadUserFavicon functions
├── prisma/
│   └── zod-utils.ts                           # [MODIFY] Extend userMetadata schema for logo/favicon
└── ui/components/
    └── image-uploader/
        └── ImageUploader.tsx                  # [REUSE] Existing component

tests/
└── playwright/settings/
    └── upload-branding.e2e.ts                 # [CREATE] E2E tests for logo/favicon upload
```

**Structure Decision**: Cal.com uses a monorepo structure with clear separation between `apps/web` (Next.js app) and `packages` (shared libraries). Logo/favicon upload follows the existing avatar upload pattern established in `packages/lib/server/avatar.ts`, storing images in the `Avatar` table with UUID objectKeys. The UI modifications are concentrated in the appearance settings view, while display logic is added to public booking page components.

## Research Phase Summary

### Existing Patterns Identified

**Image Upload Pattern (Avatar/Team Logos):**

- Images stored as base64 strings in `Avatar` table with UUID `objectKey`
- Served via `/api/avatar/[uuid].png` route with caching headers
- `ImageUploader` component handles file selection, cropping, and base64 conversion
- `uploadAvatar` and `uploadLogo` functions in `packages/lib/server/avatar.ts`
- Automatic deletion of old images on replacement (upsert pattern)

**User Settings Pattern:**

- User metadata stored in `User.metadata` JSON field
- tRPC mutations in `packages/trpc/server/routers/viewer/me/`
- Appearance settings UI in `apps/web/modules/settings/my-account/appearance-view.tsx`
- React Hook Form for form state management
- Server-side revalidation after updates

**Public Page Pattern:**

- Public booking pages use `Booker` component from `@calcom/atoms/booker`
- User public view in `apps/web/modules/users/views/users-public-view.tsx`
- User data fetched server-side via `getServerSideProps`
- Theme and branding applied via hooks (`useTheme`, `useBrandColors`)

### Key Architectural Decisions

**Decision 1: Reuse Avatar Table**

- **Choice**: Store logo and favicon in existing `Avatar` table
- **Rationale**: Proven pattern, existing API route, automatic cache-busting with UUID
- **Alternative Rejected**: New table or file system storage (adds complexity, violates file consolidation principle)

**Decision 2: Metadata for Tracking**

- **Choice**: Store logo/favicon objectKeys in `User.metadata.businessLogo` and `User.metadata.favicon`
- **Rationale**: Flexible, no schema migration, follows Cal.com patterns
- **Alternative Rejected**: New columns on User table (requires migration, less flexible)

**Decision 3: Single Image Per Type**

- **Choice**: One logo, one favicon per user (enforced via metadata structure)
- **Rationale**: Matches spec requirements, simpler implementation
- **Alternative Rejected**: Multiple logos (out of scope, complex UI)

**Decision 4: Immediate Deletion**

- **Choice**: Delete old images immediately on replace/remove
- **Rationale**: Prevents storage waste, aligns with clarification Q3 & Q5 answers
- **Alternative Rejected**: Soft delete or retention period (adds complexity)

**Decision 5: Dimension Enforcement**

- **Choice**: Client-side scaling to 400×150px max (CSS), no server-side resizing
- **Rationale**: Simpler implementation, browser handles scaling efficiently
- **Alternative Rejected**: Server-side image processing (requires additional dependencies)

## Data Model

### User Metadata Extension

```typescript
// packages/prisma/zod-utils.ts - Extend userMetadata schema

interface UserBrandingMetadata {
  businessLogo?: {
    objectKey: string; // UUID referencing Avatar table
    uploadedAt: string; // ISO timestamp
    originalFilename: string;
  };
  favicon?: {
    objectKey: string; // UUID referencing Avatar table
    uploadedAt: string; // ISO timestamp
    originalFilename: string;
  };
}

// User.metadata will be typed to include optional businessLogo and favicon
```

### Avatar Table Usage

```
Avatar table (existing schema):
- teamId: 0 (indicates user-level asset)
- userId: <user_id>
- data: <base64_string>
- objectKey: <uuid>
- isBanner: false for logo, true for favicon (repurpose this field)

Note: We'll use isBanner field to distinguish between logo (false) and favicon (true)
```

### API Endpoints

**tRPC Procedures (all under `viewer.me.*`):**

1. `uploadLogo` - Upload business logo

   - Input: `{ data: string (base64) }`
   - Output: `{ objectKey: string, url: string }`
   - Logic: Validate size, call `uploadUserLogo()`, update metadata

2. `deleteLogo` - Remove business logo

   - Input: None
   - Output: `{ success: boolean }`
   - Logic: Delete from Avatar table, remove from metadata

3. `uploadFavicon` - Upload custom favicon

   - Input: `{ data: string (base64) }`
   - Output: `{ objectKey: string, url: string }`
   - Logic: Validate size, call `uploadUserFavicon()`, update metadata

4. `deleteFavicon` - Remove custom favicon
   - Input: None
   - Output: `{ success: boolean }`
   - Logic: Delete from Avatar table, remove from metadata

**Existing Endpoints (reused):**

- `GET /api/avatar/[uuid].png` - Serves logo and favicon images

## Implementation Phases

### Phase 0: Foundation Setup

**Tasks:**

1. Create feature branch `001-custom-branding`
2. Set up test fixtures (sample logo/favicon images)
3. Document existing avatar upload flow for reference

**Deliverable**: Branch ready, test assets prepared

---

### Phase 1: Backend - Storage & API

**Tasks:**

1. **Extend avatar.ts with logo/favicon functions**

   - File: `packages/lib/server/avatar.ts`
   - Add `uploadUserLogo(userId: number, data: string)` function
   - Add `uploadUserFavicon(userId: number, data: string)` function
   - Handle old file deletion (query existing, delete before upsert)
   - Return `/api/avatar/[uuid].png` URL

2. **Create tRPC mutation handlers**

   - Create `packages/trpc/server/routers/viewer/me/uploadLogo.handler.ts`
     - Validate input (base64, size < 5MB decoded)
     - Call `uploadUserLogo()`
     - Update `user.metadata.businessLogo` with objectKey
     - Return objectKey and URL
   - Create `packages/trpc/server/routers/viewer/me/deleteLogo.handler.ts`
     - Delete Avatar record (teamId=0, userId=X, isBanner=false)
     - Remove `user.metadata.businessLogo`
   - Create `packages/trpc/server/routers/viewer/me/uploadFavicon.handler.ts`
     - Validate input (base64, size < 1MB decoded)
     - Call `uploadUserFavicon()`
     - Update `user.metadata.favicon` with objectKey
   - Create `packages/trpc/server/routers/viewer/me/deleteFavicon.handler.ts`
     - Delete Avatar record (teamId=0, userId=X, isBanner=true)
     - Remove `user.metadata.favicon`

3. **Register tRPC mutations**

   - File: `packages/trpc/server/routers/viewer/me/_router.tsx`
   - Add: `uploadLogo`, `deleteLogo`, `uploadFavicon`, `deleteFavicon`

4. **Extend Zod schema for metadata**
   - File: `packages/prisma/zod-utils.ts`
   - Add `businessLogo` and `favicon` optional fields to `userMetadata` schema

**Deliverable**: Backend API ready for logo/favicon upload, replacement, deletion

---

### Phase 2: Frontend - Appearance Settings UI

**Tasks:**

1. **Add logo upload section to appearance settings**

   - File: `apps/web/modules/settings/my-account/appearance-view.tsx`
   - Import `ImageUploader` component
   - Add "Business Logo" section with:
     - `ImageUploader` component (target="logo", max 5MB)
     - Preview of uploaded logo (if exists)
     - "Delete Logo" button (if exists)
   - Wire up to `trpc.viewer.me.uploadLogo.useMutation()`
   - Wire up to `trpc.viewer.me.deleteLogo.useMutation()`
   - Show success/error toasts

2. **Add favicon upload section to appearance settings**

   - Same file: `appearance-view.tsx`
   - Add "Favicon" section with:
     - `ImageUploader` component (target="favicon", max 1MB)
     - Preview of uploaded favicon (if exists)
     - "Delete Favicon" button (if exists)
   - Wire up to `trpc.viewer.me.uploadFavicon.useMutation()`
   - Wire up to `trpc.viewer.me.deleteFavicon.useMutation()`
   - Show success/error toasts
   - Display recommendation: "Recommended: 32×32px minimum"

3. **Add validation and user feedback**
   - File size validation (5MB logo, 1MB favicon)
   - Format validation (PNG, JPG, SVG for logo; ICO, PNG for favicon)
   - Upload progress indication
   - Clear error messages

**Deliverable**: Users can upload, preview, replace, and delete logo/favicon from settings

---

### Phase 3: Frontend - Public Page Display

**Tasks:**

1. **Display logo on user public booking page**

   - File: `apps/web/modules/users/views/users-public-view.tsx`
   - Check if `user.metadata.businessLogo.objectKey` exists
   - If exists, render `<img>` above existing content:
     - `src="/api/avatar/{objectKey}.png"`
     - `alt="Business logo"`
     - CSS: `max-width: 400px; max-height: 150px; margin: 0 auto; display: block;`
   - Ensure responsive (Tailwind: `max-w-[400px] max-h-[150px] mx-auto`)

2. **Display logo on event type booking page**

   - File: `apps/web/modules/users/views/users-type-public-view.tsx`
   - Fetch user data in `getServerSideProps`
   - Pass logo URL to `Booker` component as prop
   - Modify `Booker` component (if needed) to display logo

3. **Apply custom favicon to public pages**

   - File: `apps/web/modules/users/views/users-public-view.tsx` and `users-type-public-view.tsx`
   - Check if `user.metadata.favicon.objectKey` exists
   - If exists, inject `<link rel="icon" href="/api/avatar/{objectKey}.png">` in `<Head>`
   - Use Next.js `Head` component or metadata API

4. **Add responsive scaling**
   - Ensure logo scales properly on mobile (<400px width devices)
   - Test on tablet (768px) and mobile (375px) viewports
   - Maintain aspect ratio with CSS `object-fit: contain`

**Deliverable**: Logo displays centered on public pages, favicon shows in browser tabs

---

### Phase 4: Testing & Validation

**Tasks:**

1. **Create E2E test suite**

   - File: `apps/web/playwright/settings/upload-branding.e2e.ts`
   - Test: Upload logo from appearance settings
   - Test: Logo displays on public page
   - Test: Replace logo with new one
   - Test: Delete logo reverts to default
   - Test: Upload favicon from appearance settings
   - Test: Favicon displays in browser tab
   - Test: File validation (size, format)

2. **Manual testing checklist**

   - Upload PNG, JPG, SVG logos (5MB limit)
   - Upload ICO, PNG favicons (1MB limit)
   - Verify logo dimensions (400×150px max)
   - Test on desktop, tablet, mobile
   - Test logo replacement (old file deleted)
   - Test logo deletion (file removed from storage)
   - Verify public URL obscurity (UUID-based)

3. **Edge case testing**
   - Upload extremely large file (>5MB logo, >1MB favicon)
   - Upload unsupported format (BMP, TIFF)
   - Upload unusual aspect ratio (10:1 logo)
   - Test network interruption during upload
   - Test rapid multiple uploads

**Deliverable**: All tests passing, edge cases handled

---

### Phase 5: Documentation & Polish

**Tasks:**

1. **Code documentation**

   - Add JSDoc comments to all new functions
   - Comment complex logic (UUID generation, metadata updates)
   - Document Avatar table repurposing strategy

2. **User-facing documentation**

   - Update appearance settings with inline help text
   - Add tooltip: "Your logo will display at the top of your booking page"
   - Add tooltip: "Favicon appears in browser tabs (32×32px recommended)"

3. **Error handling polish**

   - Graceful fallback if image URL invalid
   - Clear error messages for validation failures
   - Loading states during upload

4. **Code cleanup**
   - Remove any console.logs or debug code
   - Ensure consistent code formatting
   - Run linter and fix any issues

**Deliverable**: Production-ready code with complete documentation

---

## Complexity Tracking

_No violations requiring justification. All implementation follows existing Cal.com patterns._

| Aspect           | Complexity Level | Justification                                                      |
| ---------------- | ---------------- | ------------------------------------------------------------------ |
| File count       | Low              | Reuses existing components, minimal new files (4 handlers, 1 test) |
| Dependencies     | Low              | No new dependencies, reuses existing libraries                     |
| Database changes | Low              | No schema migration, uses existing Avatar table and metadata field |
| API surface      | Low              | 4 new tRPC procedures following established patterns               |

## Dependencies & Execution Order

**Phase Dependencies:**

- Phase 1 (Backend) must complete before Phase 2 (Frontend UI)
- Phase 2 must complete before Phase 3 (Public Display)
- Phase 3 must complete before Phase 4 (Testing)
- Phase 4 informs Phase 5 (Polish)

**Critical Path:**

1. Backend storage functions → tRPC mutations → UI controls → Public display → Tests → Polish

**Parallel Opportunities:**

- Logo and favicon implementations can proceed in parallel after backend setup
- E2E tests can be written in parallel with Phase 3

## Risk Assessment

| Risk                               | Probability | Impact | Mitigation                                                                  |
| ---------------------------------- | ----------- | ------ | --------------------------------------------------------------------------- |
| Base64 storage grows database size | Medium      | Medium | Monitor size, consider migration to object storage in future (out of scope) |
| Avatar table repurposing conflicts | Low         | High   | Use clear isBanner field differentiation, add integration tests             |
| Public URL guessing attack         | Low         | Low    | UUIDs provide sufficient entropy (2^122 combinations)                       |
| Image format compatibility         | Low         | Medium | Validate formats server-side, test common formats                           |
| Mobile rendering issues            | Medium      | Medium | Comprehensive responsive testing, CSS max-width constraints                 |

## Rollback Strategy

**If deployment issues occur:**

1. Feature flag: Add `ENABLE_CUSTOM_BRANDING` env variable
2. Database rollback: Clear `user.metadata.businessLogo` and `user.metadata.favicon` fields
3. Avatar cleanup: Delete orphaned Avatar records where `teamId=0` and `userId>0` and `isBanner IN (false, true)`
4. UI rollback: Hide branding sections from appearance settings

**Safe to rollback anytime** - no schema migrations, metadata changes are non-breaking

## Success Metrics

Aligned with spec Success Criteria:

- **SC-001**: Upload time <30s (measure via Playwright tests)
- **SC-002**: Display time <5s (verify with browser Network tab)
- **SC-003**: 99% upload success rate (monitor production logs)
- **SC-005**: 95% first-attempt success (E2E test pass rate)
- **SC-006**: Proper rendering on all devices (manual + automated responsive tests)
- **SC-007**: <1s rejection for invalid files (unit test validation functions)

## Next Steps

After plan approval, proceed to:

```
/speckit.tasks
```

This will generate a detailed task breakdown with specific file paths and implementation steps ready for execution.
