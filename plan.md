# A/B Testing Implementation Plan
## Cal.com Experiments System - Completion Roadmap

**Branch**: `feat/posthog-experiments-ui`  
**Status**: POC Completed, Production Implementation in Progress  
**Last Updated**: January 5, 2025

---

## Executive Summary

This document outlines the completion plan for Cal.com's A/B testing system. The POC has established a solid foundation with database schema, core repository logic, PostHog integration, and basic admin UI. This plan details the remaining work to make the system production-ready.

### ✅ What's Already Implemented (POC)

1. **Database Schema**: `ExperimentVariant` table with support for user/team/visitor assignments
2. **Core Repository**: `ExperimentsRepository` with caching, user/team/visitor variant assignment
3. **Variant Assignment Logic**: Deterministic hashing and random assignment
4. **PostHog Integration**: Client and server-side trackers for exposure and conversion events
5. **Factory Pattern**: Graceful fallback when PostHog is disabled
6. **tRPC API**: Admin procedures for getting/updating experiment config
7. **Basic Admin UI**: Sheet component for configuring experiments (variants, percentages, assignment type)
8. **Integration with Feature Flags**: Experiments are Features with `type: EXPERIMENT`

### ❌ What Needs Completion

1. **React Hooks**: `useExperiment()` hook for easy component usage
2. **Full Admin UI**: Pages for listing, creating, managing experiments
3. **Experiment Lifecycle Management**: Starting, pausing, concluding experiments
4. **Analytics Integration**: Viewing experiment results
5. **Targeting Rules**: Plan-based or organization-based targeting
6. **Documentation & Examples**: Real-world usage examples
7. **Testing**: Unit tests, integration tests, E2E tests
8. **Client-side Visitor ID**: Anonymous user tracking

---

## Architecture Overview

### Database Model

```
Feature (existing table)
├── slug: "upgrade-button-test"
├── type: EXPERIMENT (enum)
├── enabled: true/false
├── metadata: {
│     variants: [
│       { name: "control", percentage: 50 },
│       { name: "treatment", percentage: 50 }
│     ],
│     assignmentType: "deterministic" | "random"
│   }

ExperimentVariant (new table)
├── id: uuid
├── experimentSlug: "upgrade-button-test" (references Feature.slug)
├── variant: "control" | "treatment"
├── userId: 123 (nullable)
├── teamId: 456 (nullable)
├── visitorId: "visitor-uuid" (nullable)
├── assignmentType: DETERMINISTIC | RANDOM
├── assignedAt: timestamp
└── metadata: { ... }

Unique constraints:
- (experimentSlug, userId)
- (experimentSlug, teamId)
- (experimentSlug, visitorId)
```

### Key Design Decisions

1. **No Separate Experiment Table**: Experiments are `Feature` records with `type: EXPERIMENT`
2. **Separate Assignments Table**: `ExperimentVariant` stores all variant assignments
3. **Flexible Scope**: Same table supports user-level, team-level, and visitor-level experiments
4. **Configuration in Metadata**: Experiment variants and settings stored in `Feature.metadata` JSON
5. **Both Assignment Types**: Supports deterministic (hash-based) and random assignment

### Data Flow

```
Component needs variant
        │
        ▼
  useExperiment("experiment-slug")  [TO BE BUILT]
        │
        ▼
  Check localStorage cache
        │
    ┌───┴───┐
    │       │
  Hit      Miss
    │       │
    │       ▼
    │   tRPC: getVariant()
    │       │
    │       ▼
    │   ExperimentsRepository.getVariantForUser()
    │       │
    │       ▼
    │   Check ExperimentVariant table
    │       │
    │   ┌───┴───┐
    │   │       │
    │ Exists  Missing
    │   │       │
    │   │       ▼
    │   │   Get config from Feature.metadata
    │   │       │
    │   │       ▼
    │   │   Run bucketing algorithm
    │   │   (hash or random)
    │   │       │
    │   │       ▼
    │   │   Insert ExperimentVariant
    │   │       │
    │   └───────┘
    │       │
    └───────┤
            ▼
    Return variant + track exposure
```

---

## Implementation Phases

### **Phase 1: React Hooks & Client-side Integration** ⭐ PRIORITY

Build the missing pieces to make experiments usable in components.

#### Files to Create:

**1. `packages/features/experiments/hooks/useExperiment.ts`**
```typescript
import { useEffect, useMemo } from "react";
import { trpc } from "@calcom/trpc/react";
import { trackExperimentExposureEvent } from "../utils";

export function useExperiment(
  experimentSlug: string,
  options: {
    userId?: number;
    teamId?: number;
    visitorId?: string;
    skip?: boolean;
  } = {}
) {
  // Implementation details...
  // - Fetches variant via tRPC
  // - Caches in localStorage
  // - Auto-tracks exposure on mount
  // - Returns { variant, isLoading, isControl, isNewAssignment }
}
```

**2. `packages/features/experiments/hooks/index.ts`**
```typescript
export { useExperiment } from "./useExperiment";
export { useExperimentVariant } from "./useExperimentVariant"; // Simpler version
```

**3. `packages/features/experiments/context/ExperimentProvider.tsx`** (Optional)
```typescript
// Context provider to batch fetch all active experiments
// and provide them to child components
```

#### Files to Modify:

**1. `packages/trpc/server/routers/viewer/_router.ts`**
- Add public `experiments` router (non-admin)

**2. `packages/trpc/server/routers/viewer/experiments.ts`** (NEW)
```typescript
export const experimentsRouter = router({
  getVariant: publicProcedure
    .input(z.object({
      experimentSlug: z.string(),
      userId: z.number().optional(),
      teamId: z.number().optional(),
      visitorId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Calls ExperimentsRepository
    }),
  
  listActiveExperiments: publicProcedure.query(async ({ ctx }) => {
    // Returns all EXPERIMENT features where enabled=true
  }),
});
```

**Deliverables:**
- ✅ Working `useExperiment()` hook
- ✅ Public tRPC endpoints for variant fetching
- ✅ localStorage caching for performance
- ✅ Automatic exposure tracking

**Estimated Effort**: 1-2 days

---

### **Phase 2: Admin UI - Experiment Management**

Complete the admin interface for creating and managing experiments.

#### Files to Create:

**1. `apps/web/app/(use-page-wrapper)/settings/(admin-layout)/admin/experiments/page.tsx`**
```typescript
// List all experiments (Features where type=EXPERIMENT)
// Table showing:
// - Experiment name (slug)
// - Enabled status
// - Assignment type
// - Number of variants
// - Total assignments (count from ExperimentVariant)
// - Actions: Configure, View Results, Enable/Disable
```

**2. `packages/features/experiments/components/ExperimentForm.tsx`**
```typescript
// Form for creating new experiments
// - Slug (becomes Feature.slug)
// - Description
// - Assignment type (deterministic/random)
// - Initial variants
```

**3. `packages/features/experiments/components/ExperimentList.tsx`**
```typescript
// Table component showing experiments
// Integrates with ExperimentConfigSheet (already exists)
```

**4. `packages/features/experiments/components/ExperimentAnalytics.tsx`**
```typescript
// Shows:
// - Total participants per variant
// - Conversion rates (if tracking configured)
// - Statistical significance
// - Link to PostHog for detailed analysis
```

#### Files to Modify:

**1. `packages/trpc/server/routers/viewer/admin/experiments/_router.ts`**
Add procedures:
```typescript
- createExperiment: Creates Feature with type=EXPERIMENT
- deleteExperiment: Deletes Feature and cascades to ExperimentVariant
- listExperiments: Lists all EXPERIMENT features
- getExperimentStats: Returns assignment counts per variant
- concludeExperiment: Sets enabled=false, marks winner
```

**2. `apps/web/public/static/locales/en/common.json`**
Add i18n strings for experiments UI

**Deliverables:**
- ✅ Experiments list page at `/settings/admin/experiments`
- ✅ Create experiment form
- ✅ Basic analytics view
- ✅ Enable/disable experiments
- ✅ Delete experiments with confirmation

**Estimated Effort**: 2-3 days

---

### **Phase 3: Experiment Lifecycle & Targeting**

Add experiment state management and targeting rules.

#### Experiment Status Management

Currently experiments only have `enabled: true/false`. Need richer states.

**Approach**: Add to `Feature.metadata` (no schema migration needed)

```typescript
interface ExperimentMetadata {
  variants: ExperimentVariantConfig[];
  assignmentType: AssignmentType;
  status?: "draft" | "running" | "paused" | "concluded";
  startedAt?: string;
  endedAt?: string;
  winnerVariant?: string;
  targetingRules?: TargetingRules;
}
```

#### Files to Create:

**1. `packages/features/experiments/lib/targeting.ts`**
```typescript
export async function evaluateTargeting(
  userId: number | undefined,
  teamId: number | undefined,
  targetingRules: TargetingRules,
  prisma: PrismaClient
): Promise<boolean> {
  // Checks if user/team matches targeting criteria
  // - Check plan type (Individual/Teams/Organization)
  // - Check specific team/org IDs
  // - Check user attributes
}
```

**2. `packages/features/experiments/types.ts` (extend)**
```typescript
export interface TargetingRules {
  plans?: string[];  // "individual", "teams", "organization"
  teamIds?: number[];  // Specific teams only
  organizationIds?: number[];
  excludeOrganizations?: boolean;
  userAttributes?: Record<string, any>;
}
```

#### Files to Modify:

**1. `packages/features/experiments/experiments.repository.ts`**
```typescript
// Update getExperimentConfig to parse new metadata fields
// Add checkTargeting method before assignment
// Only assign if targeting matches
```

**2. `packages/features/experiments/components/ExperimentForm.tsx`**
- Add targeting configuration UI
- Add lifecycle controls (Start, Pause, Conclude)

**3. `packages/trpc/server/routers/viewer/admin/experiments/_router.ts`**
```typescript
- updateStatus: Change experiment status
- setWinner: Conclude experiment and mark winning variant
```

**Deliverables:**
- ✅ Experiment lifecycle states (draft → running → concluded)
- ✅ Targeting rules configuration
- ✅ Start/pause/conclude actions
- ✅ Winner selection UI

**Estimated Effort**: 1.5-2 days

---

### **Phase 4: Anonymous Visitor Tracking**

Enable experiments for non-logged-in users.

#### Files to Create:

**1. `packages/features/experiments/lib/visitor-id.ts`**
```typescript
const VISITOR_ID_KEY = "cal_visitor_id";
const VISITOR_ID_COOKIE = "cal_vid";

export function getOrCreateVisitorId(): string {
  // 1. Check localStorage for existing ID
  if (typeof window !== "undefined") {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;
  }
  
  // 2. Check cookie (for server-side)
  const cookieId = getCookie(VISITOR_ID_COOKIE);
  if (cookieId) {
    if (typeof window !== "undefined") {
      localStorage.setItem(VISITOR_ID_KEY, cookieId);
    }
    return cookieId;
  }
  
  // 3. Generate new UUID
  const newId = generateUUID();
  
  // 4. Store in both localStorage and cookie
  if (typeof window !== "undefined") {
    localStorage.setItem(VISITOR_ID_KEY, newId);
  }
  setCookie(VISITOR_ID_COOKIE, newId, { maxAge: 365 * 24 * 60 * 60 }); // 1 year
  
  return newId;
}
```

**2. `packages/features/experiments/hooks/useVisitorExperiment.ts`**
```typescript
import { useMemo } from "react";
import { useExperiment } from "./useExperiment";
import { getOrCreateVisitorId } from "../lib/visitor-id";

export function useVisitorExperiment(experimentSlug: string) {
  const visitorId = useMemo(() => getOrCreateVisitorId(), []);
  return useExperiment(experimentSlug, { visitorId });
}
```

#### Files to Modify:

**1. `packages/features/experiments/hooks/index.ts`**
```typescript
export { useVisitorExperiment } from "./useVisitorExperiment";
```

**2. Update cookie handling**
- Ensure visitor ID cookie is set on first visit
- Handle server-side rendering properly

**Deliverables:**
- ✅ Visitor ID generation and persistence
- ✅ `useVisitorExperiment()` hook
- ✅ Cookie-based tracking for anonymous users
- ✅ localStorage sync for client-side caching

**Estimated Effort**: 0.5-1 day

---

### **Phase 5: Testing & Documentation**

Ensure reliability and developer experience.

#### Unit Tests

**1. `packages/features/experiments/utils/variant-assignment.test.ts`**
```typescript
describe("Deterministic assignment", () => {
  it("returns same variant for same user+experiment", () => {
    const variant1 = assignVariantDeterministic("user-123", "exp-1", variants);
    const variant2 = assignVariantDeterministic("user-123", "exp-1", variants);
    expect(variant1).toBe(variant2);
  });
  
  it("distributes variants according to percentages", () => {
    // Test 1000 users, expect ~500 in each variant
  });
  
  it("validates percentages sum to 100", () => {
    expect(validateVariantPercentages(invalidVariants)).toBe(false);
  });
});
```

**2. `packages/features/experiments/experiments.repository.test.ts`**
```typescript
describe("ExperimentsRepository", () => {
  it("assigns variant on first request", () => {});
  it("returns cached variant on subsequent requests", () => {});
  it("handles team-level experiments", () => {});
  it("respects targeting rules", () => {});
});
```

#### Integration Tests

**1. `packages/trpc/server/routers/viewer/experiments.test.ts`**
```typescript
describe("Experiments tRPC router", () => {
  it("creates experiment via admin", () => {});
  it("user gets assigned variant", () => {});
  it("team gets assigned variant", () => {});
  it("targeting prevents assignment", () => {});
});
```

#### E2E Tests

**1. `apps/web/playwright/experiments.e2e.ts`**
```typescript
test("admin can create experiment", async ({ page }) => {
  // Navigate to admin experiments
  // Fill form
  // Submit
  // Verify in list
});

test("user sees variant in component", async ({ page }) => {
  // Create experiment
  // Login as user
  // Visit page with experiment
  // Verify variant is shown
});

test("variant persists across page reloads", async ({ page }) => {
  // Get assigned variant
  // Reload page
  // Verify same variant
});
```

#### Documentation

**1. Update `packages/features/experiments/README.md`**
- Add React hook examples
- Add real-world use cases
- Add troubleshooting section
- Add PostHog analysis guide

**2. Create `packages/features/experiments/EXAMPLES.md`**
```markdown
## Example 1: Upgrade Button CTA Test (User-level)
## Example 2: Dashboard Layout Test (Team-level)
## Example 3: Landing Page Hero (Visitor-level)
## Example 4: Multi-variant Test (A/B/C testing)
## Example 5: Targeting by Plan Type
```

**Deliverables:**
- ✅ Unit test coverage >80%
- ✅ Integration tests for all tRPC endpoints
- ✅ E2E tests for critical user flows
- ✅ Comprehensive documentation
- ✅ Real-world examples

**Estimated Effort**: 2-3 days

---

## Complete File Structure

```
packages/features/experiments/
├── README.md                          ✅ EXISTS
├── EXAMPLES.md                        ⭐ TO CREATE (Phase 5)
├── types.ts                           ✅ EXISTS (needs extension Phase 3)
├── experiments.repository.ts          ✅ EXISTS
├── experiments.repository.test.ts     ⭐ TO CREATE (Phase 5)
├── index.ts                           ✅ EXISTS
│
├── hooks/                             ⭐ TO CREATE (Phase 1)
│   ├── useExperiment.ts
│   ├── useExperimentVariant.ts
│   ├── useVisitorExperiment.ts        (Phase 4)
│   └── index.ts
│
├── context/                           ⭐ OPTIONAL (Phase 1)
│   └── ExperimentProvider.tsx
│
├── components/                        ⭐ TO CREATE (Phase 2)
│   ├── ExperimentList.tsx
│   ├── ExperimentForm.tsx
│   └── ExperimentAnalytics.tsx
│
├── lib/
│   ├── client/
│   │   └── posthog-tracker.ts       ✅ EXISTS
│   ├── server/
│   │   └── posthog-tracker.ts       ✅ EXISTS
│   ├── experiment-factory.ts         ✅ EXISTS
│   ├── targeting.ts                  ⭐ TO CREATE (Phase 3)
│   └── visitor-id.ts                 ⭐ TO CREATE (Phase 4)
│
└── utils/
    ├── variant-assignment.ts         ✅ EXISTS
    ├── variant-assignment.test.ts    ⭐ TO CREATE (Phase 5)
    └── index.ts                      ✅ EXISTS

apps/web/app/(use-page-wrapper)/settings/(admin-layout)/admin/
└── experiments/                      ⭐ TO CREATE (Phase 2)
    ├── page.tsx                      (List view)
    ├── new/
    │   └── page.tsx                  (Create form)
    └── [slug]/
        └── edit/
            └── page.tsx              (Edit form)

packages/trpc/server/routers/viewer/
├── experiments.ts                    ⭐ TO CREATE (Phase 1)
└── admin/
    └── experiments/
        └── _router.ts                ✅ EXISTS (needs extension Phase 2)

packages/features/flags/components/
├── ExperimentConfigSheet.tsx         ✅ EXISTS
├── FlagAdminList.tsx                 ✅ EXISTS (modified to show experiments)
└── AssignFeatureSheet.tsx            ✅ EXISTS
```

---

## Usage Examples (After Completion)

### Example 1: User-Level Experiment (Upgrade Button)

```typescript
// 1. Create experiment in Admin UI
// slug: "upgrade-button-test"
// variants: [
//   { name: "control", percentage: 50 },  // "Manage Billing"
//   { name: "urgent", percentage: 50 }    // "Upgrade Now!"
// ]
// assignmentType: "deterministic"

// 2. Use in component
import { useExperiment } from "@calcom/features/experiments/hooks";
import { useSession } from "next-auth/react";

function BillingButton() {
  const session = useSession();
  const { variant, isLoading } = useExperiment("upgrade-button-test", {
    userId: session.data?.user.id,
  });
  
  if (isLoading) {
    return <Button>Manage Billing</Button>; // Default
  }
  
  const buttonText = variant === "urgent" 
    ? "Upgrade Now!" 
    : "Manage Billing";
  
  return (
    <Button onClick={() => {
      // Track conversion
      trackExperimentConversion(
        "upgrade-button-test",
        variant,
        "deterministic",
        { conversionEvent: "billing_button_clicked" }
      );
    }}>
      {buttonText}
    </Button>
  );
}
```

### Example 2: Team-Level Experiment (Dashboard Layout)

```typescript
// All members of a team see the same variant

import { useExperiment } from "@calcom/features/experiments/hooks";
import { useTeam } from "@calcom/lib/hooks/useTeam";

function TeamDashboard() {
  const team = useTeam();
  const { variant, isLoading } = useExperiment("dashboard-layout-v2", {
    teamId: team.id,
  });
  
  if (isLoading) {
    return <DashboardSkeleton />;
  }
  
  if (variant === "grid") {
    return <GridDashboard />;
  }
  
  return <ListDashboard />;
}
```

### Example 3: Visitor Experiment (Anonymous Users)

```typescript
// Works for logged-out users

import { useVisitorExperiment } from "@calcom/features/experiments/hooks";

function LandingPageHero() {
  const { variant, isLoading } = useVisitorExperiment("landing-hero-test");
  
  const headline = variant === "benefit-focused"
    ? "Schedule meetings in seconds"
    : "The open-source Calendly alternative";
  
  return <h1>{headline}</h1>;
}
```

### Example 4: Multi-variant Test (A/B/C Testing)

```typescript
// Test 3+ variants

// Admin UI config:
// variants: [
//   { name: "control", percentage: 33.3 },
//   { name: "variant-a", percentage: 33.3 },
//   { name: "variant-b", percentage: 33.4 }
// ]

function PricingPage() {
  const session = useSession();
  const { variant } = useExperiment("pricing-tiers", {
    userId: session.data?.user.id,
  });
  
  const pricing = {
    "control": { individual: 10, teams: 20 },
    "variant-a": { individual: 12, teams: 24 },
    "variant-b": { individual: 8, teams: 16 },
  }[variant || "control"];
  
  return <PricingTable prices={pricing} />;
}
```

---

## Open Questions & Decisions Needed

### 1. **Experiment Lifecycle Status Storage**

**Question**: Where should experiment status (draft/running/paused/concluded) be stored?

**Options**:
- **A)** Store in `Feature.metadata` (lighter weight, no migration)
- **B)** Add columns to `Feature` table (cleaner, requires migration)

**Recommendation**: **Option A** to avoid schema changes.

**Decision**: [ ] A  [ ] B  [ ] Other: ___________

---

### 2. **Team-Level Bucketing Behavior**

**Question**: How should team experiments assign variants?

**Current POC behavior** (per-team):
- Team A (all members) → "control"
- Team B (all members) → "treatment"

**Alternative behavior** (per-user within team):
- Team A: Alice → "control", Bob → "treatment"
- Team B: Charlie → "treatment", Dave → "control"

**Recommendation**: Keep current behavior (per-team) for consistency within teams.

**Decision**: [ ] Per-team (current)  [ ] Per-user  [ ] Configurable

---

### 3. **Targeting Rules Application**

**Question**: When should targeting be evaluated?

**Options**:
- **A)** Before assignment (user never gets assigned if they don't match)
- **B)** After assignment (user gets assigned but variant is hidden)

**Recommendation**: **Option A** - don't create ExperimentVariant records for users outside targeting.

**Decision**: [ ] A  [ ] B  [ ] Other: ___________

---

### 4. **PostHog Person Properties**

**Question**: Should we set PostHog person properties when assigning variants?

```typescript
posthog.capture("experiment_viewed", {
  experiment_slug: "test",
  variant: "control",
  $set: {
    experiment_test: "control",  // Sets person property
  },
});
```

**Pros**: Easier to segment in PostHog  
**Cons**: Pollutes person properties

**Recommendation**: Make it optional via experiment config flag.

**Decision**: [ ] Always set  [ ] Never set  [ ] Optional (configurable)

---

### 5. **Migration for Existing Features**

**Question**: Should we provide a migration script to convert existing Feature flags to experiments?

**Use case**: Convert `"new-onboarding"` feature flag → experiment with control/treatment variants

**Recommendation**: Yes, provide optional migration helper.

**Decision**: [ ] Yes  [ ] No  [ ] Later

---

## Total Effort Estimate

| Phase | Description | Estimated Time | Priority |
|-------|-------------|----------------|----------|
| Phase 1 | React Hooks & Client Integration | 1-2 days | ⭐ Critical |
| Phase 2 | Admin UI - Full Management | 2-3 days | ⭐ Critical |
| Phase 3 | Lifecycle & Targeting | 1.5-2 days | 🔶 High |
| Phase 4 | Visitor Tracking | 0.5-1 day | 🔶 High |
| Phase 5 | Testing & Docs | 2-3 days | 🔷 Medium |
| **TOTAL** | **Complete Implementation** | **7-11 days** | |

---

## Success Criteria

### Phase 1 Complete When:
- [ ] `useExperiment()` hook works in components
- [ ] Variants persist across page reloads
- [ ] Exposure events tracked to PostHog
- [ ] Works for user-level and team-level experiments

### Phase 2 Complete When:
- [ ] Admin can create experiments via UI
- [ ] Admin can view all experiments in a list
- [ ] Admin can edit experiment configuration
- [ ] Admin can enable/disable experiments
- [ ] Basic analytics showing variant distribution

### Phase 3 Complete When:
- [ ] Experiments have lifecycle states
- [ ] Targeting rules work (plan-based, team-based)
- [ ] Admin can conclude experiments and set winners
- [ ] Concluded experiments stop accepting new assignments

### Phase 4 Complete When:
- [ ] Anonymous visitors get assigned variants
- [ ] Visitor IDs persist across sessions
- [ ] Visitor experiments work the same as user experiments

### Phase 5 Complete When:
- [ ] Test coverage >80%
- [ ] All critical paths have E2E tests
- [ ] Documentation includes 5+ real-world examples
- [ ] README updated with full API reference

---

## PostHog Analysis Guide

### Events Tracked

#### `experiment_viewed`
- **When**: User/team/visitor is assigned to a variant
- **Properties**:
  - `experiment_slug`: Experiment identifier
  - `variant`: Assigned variant name
  - `assignment_type`: "deterministic" or "random"
  - `user_id`: User ID (if applicable)
  - `team_id`: Team ID (if applicable)
  - `visitor_id`: Visitor ID (if applicable)

#### `experiment_conversion`
- **When**: User completes a conversion action
- **Properties**:
  - `experiment_slug`: Experiment identifier
  - `variant`: User's variant
  - `assignment_type`: "deterministic" or "random"
  - `conversion_event`: Name of conversion (e.g., "billing_button_clicked")
  - `user_id`: User ID (if applicable)
  - `team_id`: Team ID (if applicable)
  - `visitor_id`: Visitor ID (if applicable)

### PostHog Queries

**Variant Distribution**:
```sql
-- In PostHog Insights
-- Event: experiment_viewed
-- Breakdown by: properties.variant
-- Filter: properties.experiment_slug = 'your-experiment-slug'
```

**Conversion Funnel**:
```sql
-- In PostHog Funnels
-- Step 1: experiment_viewed (experiment_slug = 'test')
-- Step 2: experiment_conversion (conversion_event = 'billing_button_clicked')
-- Breakdown by: variant
```

**Statistical Significance**:
- Use PostHog's built-in A/B test analysis
- Or export data and use external tools (e.g., Evan's Awesome A/B Tools)

---

## Migration Path (If Needed)

If converting existing feature flags to experiments:

```sql
-- Example: Convert "new-onboarding" feature to experiment
UPDATE "Feature"
SET 
  type = 'EXPERIMENT',
  metadata = '{
    "variants": [
      {"name": "control", "percentage": 50},
      {"name": "treatment", "percentage": 50}
    ],
    "assignmentType": "deterministic"
  }'::jsonb
WHERE slug = 'new-onboarding';

-- Create assignments for users who already have feature enabled
INSERT INTO "ExperimentVariant" (
  "id",
  "experimentSlug",
  "variant",
  "userId",
  "assignmentType",
  "assignedAt"
)
SELECT
  gen_random_uuid(),
  'new-onboarding',
  'treatment',
  uf."userId",
  'DETERMINISTIC',
  NOW()
FROM "UserFeatures" uf
WHERE uf."featureId" = 'new-onboarding'
  AND uf."enabled" = true;
```

---

## Next Steps

1. **Review this plan** and answer the 5 open questions
2. **Approve Phase 1** to begin implementation
3. **Assign priorities** to phases based on business needs
4. **Set timeline** for each phase
5. **Begin implementation** starting with Phase 1 (React Hooks)

---

## Notes

- POC is in excellent shape - core infrastructure is solid
- Main missing piece is developer experience (hooks) and admin UI
- Testing is critical - experiments affect user experience
- Documentation will be key for adoption across teams
- Consider soft launch with internal team before full rollout

---

**Plan created**: January 5, 2025  
**Last updated**: January 5, 2025  
**Status**: Awaiting approval to begin Phase 1
