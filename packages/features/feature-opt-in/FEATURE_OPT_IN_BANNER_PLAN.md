# Feature Opt-In Banner System Plan

This document outlines the high-level plan for implementing a feature opt-in banner/popup system that allows users to opt into experimental features directly from the pages where those features apply.

## Overview

When a new opt-in feature (like "bookings-v3") is available, users will see a floating banner on relevant pages. Clicking the banner opens a confirmation dialog where users can opt-in based on their role (org owner, team owner, or regular user).

---

## 1. Backend: New TRPC Procedure

**Location:** `packages/trpc/server/routers/viewer/featureOptIn/_router.ts`

**New Procedure:** `checkFeatureOptInEligibility`

This procedure will:
- Accept a `featureId` parameter (e.g., "bookings-v3")
- Use the existing `resolveFeatureStatesAcrossTeams` function from `FeatureOptInService`
- Return one of three response types:
  1. **Already Enabled**: User effectively has the feature enabled - no banner needed
  2. **Can Opt-In**: User can opt-in - return user's role context (feature metadata like title/description comes from `getOptInFeatureConfig()` in `config.ts`)
  3. **Cannot Opt-In**: User is blocked by org/team (strict policy) - return blocking reason

The response should include:
- User's role context for the confirmation dialog:
  - Is org owner/admin?
  - Which teams is user owner/admin of?
  - Organization ID (if applicable)
  - Team IDs where user has admin rights

---

## 2. Frontend: Custom Hook

**Location:** New file in `apps/web/modules/feature-opt-in/hooks/`

**Hook:** `useFeatureOptInBanner(featureId: string)`

This hook will:
1. **Check localStorage first** for dismissal state in a single consolidated key `feature-opt-in-dismissed`
   - The key stores an object mapping feature IDs to dismissal status: `{ "bookings-v3": true, "insights-v2": true }`
   - If the feature is dismissed, skip the TRPC call entirely and return `{ shouldShow: false }`
   - Using a single key avoids localStorage bloat from multiple per-feature keys
2. **Call the TRPC procedure** if not dismissed
3. **Get feature metadata** from `getOptInFeatureConfig(featureId)` in `config.ts` for title/description i18n keys
4. **Return state** for the banner:
   - `shouldShow: boolean`
   - `featureConfig: OptInFeatureConfig` (from config.ts, includes titleI18nKey, descriptionI18nKey)
   - `canOptIn: boolean`
   - `blockingReason: string | null`
   - `userRoleContext: { isOrgAdmin, adminTeamIds, orgId }`
   - `dismiss(): void` - updates the consolidated localStorage key
   - `openDialog(): void` - triggers confirmation dialog

---

## 3. UI Components

### 3a. Floating Banner Component

**Location:** `packages/features/feature-opt-in/components/FeatureOptInBanner.tsx`

A minimal floating banner positioned at bottom-right:
- Small rectangle with feature title and brief description
- Close button (X) - calls `dismiss()` to save to localStorage
- Clickable area - opens confirmation dialog
- Can be refined later for design polish

### 3b. Confirmation Dialog

**Location:** `packages/features/feature-opt-in/components/FeatureOptInConfirmDialog.tsx`

Complex dialog with role-based options:

**For Org Owners/Admins:**
- Radio/checkbox to choose scope:
  - "Enable for entire organization"
  - "Enable just for me"
- Auto opt-in checkbox: "Automatically opt into future features for my organization"

**For Team Owners/Admins (not org admin):**
- Radio/checkbox to choose scope:
  - "Enable for my teams" (list team names if multiple)
  - "Enable just for me"
- Auto opt-in checkbox: "Automatically opt into future features for my teams"

**For Regular Users:**
- Simple confirmation message
- Auto opt-in checkbox: "Automatically opt into future features"

**CTA Button:** "Enable Feature" - calls appropriate mutation(s) based on selection

### 3c. Success State (within Confirmation Dialog)

Instead of a separate success dialog (which would cause UI flashing), the confirmation dialog handles the success state internally:

**Flow:**
1. User clicks "Enable Feature" button
2. Button shows a loading spinner while the mutation runs
3. On success, the dialog content transitions to show success state
4. Success state displays:
   - "Successfully enabled!" message
   - Two buttons:
     1. "Dismiss" - closes dialog
     2. "View Settings" - redirects to appropriate settings page

**Redirect Logic:**
- If user opted in for org: `/settings/organizations/features`
- If user opted in for team(s): `/settings/teams/[first-team-id]/features`
- If user opted in for self only: `/settings/my-account/features`

This approach provides a smoother UX by avoiding the jarring close-and-reopen of separate dialogs.

---

## 4. Integration Points

**Example:** `apps/web/modules/bookings/views/bookings-view.tsx`

At the view level:
1. Import and call the hook: `const optInBanner = useFeatureOptInBanner("bookings-v3")`
2. Conditionally render the banner: `{optInBanner.shouldShow && <FeatureOptInBanner {...optInBanner} />}`

This pattern can be replicated for any view where a feature opt-in banner is needed.

---

## 5. Policy Considerations

The existing `computeEffectiveStateAcrossTeams` function already handles the two policies:

**Permissive Policy:**
- User can opt-in even if org/teams haven't explicitly enabled
- Only blocked if ALL teams have explicitly disabled

**Strict Policy:**
- User cannot opt-in alone; requires org/team to enable first
- ANY explicit disable from org/team blocks the user

The TRPC procedure should use the feature's policy (from `OPT_IN_FEATURES` config) to determine if the user can opt-in.

---

## 6. Data Flow Summary

```
View (bookings-view.tsx)
    |
    v
useFeatureOptInBanner("bookings-v3")
    |
    v
[Check localStorage for dismissal]
    | (if not dismissed)
    v
TRPC: checkFeatureOptInEligibility
    |
    v
FeatureOptInService.resolveFeatureStatesAcrossTeams
    |
    v
[Return eligibility + user role context]
    |
    v
Render FeatureOptInBanner (if eligible)
    | (on click)
    v
FeatureOptInConfirmDialog
    | (on confirm)
    v
Existing mutations: setUserState / setTeamState / setOrganizationState
    |
    v
[Dialog transitions to success state]
```

---

## 7. Key Dependencies on PR #25892

This plan relies on these existing pieces from the underlying PR:
- `FeatureOptInService` and `resolveFeatureStatesAcrossTeams`
- `computeEffectiveStateAcrossTeams` with policy support
- `OPT_IN_FEATURES` config with policy field
- Existing mutations for setting user/team/org states
- Settings pages at `/settings/*/features`

---

## 8. Files to Create/Modify

### New Files:
- `packages/features/feature-opt-in/components/FeatureOptInBanner.tsx`
- `packages/features/feature-opt-in/components/FeatureOptInConfirmDialog.tsx` (includes success state handling)
- `apps/web/modules/feature-opt-in/hooks/useFeatureOptInBanner.ts`

### Modified Files:
- `packages/trpc/server/routers/viewer/featureOptIn/_router.ts` (add new procedure)
- `apps/web/modules/bookings/views/bookings-view.tsx` (integrate banner)
- Translation files for new i18n keys
