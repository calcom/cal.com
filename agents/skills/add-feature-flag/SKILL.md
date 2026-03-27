---
name: add-feature-flag
description: How to add feature flags in Cal.com. Covers internal-only flags (for developer/operational control) and public feature opt-in flags (user-facing, with UI controls). Includes lifecycle policy for opt-in features.
version: 1.0.0
---

# Adding Feature Flags

Cal.com has two distinct feature flag systems. Choose the right one before you start.

## Two Types of Feature Flags

### 1. Internal Feature Flag

A global boolean toggle stored in the `Feature` database table. Used by developers to control code flow, gate rollouts, or act as a kill switch for operational concerns. **Users never see these flags in the UI.**

Examples: `calendar-cache`, `email-verification`, `pbac`, `workflow-smtp-emails`.

Use when:
- You need a kill switch for an infrastructure or backend feature
- The feature is not something end-users should opt into themselves
- You want to enable/disable something globally (or per-team via `TeamFeatures`)

### 2. Public Feature Opt-In

Builds on top of an internal feature flag but **exposes the feature to users, teams, and orgs** through a settings page and/or banner. Users can choose to enable the feature for themselves. Supports scoped state resolution (org > team > user), policies (permissive/strict), and optional Formbricks feedback surveys.

Examples: `bookings-v3` (see `OPT_IN_FEATURES` in `packages/features/feature-opt-in/config.ts`).

Use when:
- You want users (especially enterprise) to try a new feature before it becomes the default
- You need per-user/team/org granularity for enablement
- You want to collect feedback from early adopters

---

## How to Add an Internal Feature Flag

### Step 1: Register the flag in `AppFlags`

Open `packages/features/flags/config.ts` and add a new entry:

```typescript
export type AppFlags = {
  // ... existing flags ...
  "my-new-flag": boolean;
};
```

### Step 2: Seed the flag in the database

Create a Prisma migration:

```bash
yarn prisma migrate dev --create-only --name seed_my_new_flag_feature
```

Edit the generated `migration.sql` in `packages/prisma/migrations/`:

```sql
INSERT INTO "Feature" ("slug", "enabled", "type", "description", "createdAt", "updatedAt")
VALUES
  ('my-new-flag', false, 'OPERATIONAL', 'Description of what this flag controls.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
```

Set `enabled` to `false` for a flag you want to manually enable later, or `true` if it should be on by default.

**Choosing a `FeatureType`:**

The `type` column uses the `FeatureType` enum defined in `packages/prisma/schema.prisma`. Pick the one that best describes the flag's purpose:

| Type | When to use | Examples |
|---|---|---|
| `OPERATIONAL` | Infrastructure and backend capabilities that are toggled by developers/ops. This is the most common type. | `calendar-cache`, `email-verification`, `delegation-credential`, `workflow-smtp-emails` |
| `RELEASE` | Gating a new product feature during a gradual rollout. Intended to be removed once the feature is fully launched. | `monthly-proration`, `hwm-seating` |
| `EXPERIMENT` | Short-lived A/B tests or UI experiments. Should be cleaned up quickly after the experiment concludes. | `onboarding-v3`, `booking-calendar-view` |
| `KILL_SWITCH` | Emergency toggle to disable a critical system (e.g. email sending). Normally enabled; flipped to `false` only during incidents. | `emails` |
| `PERMISSION` | Access-control flags that gate features by user/team/org permission level. | (reserved — not widely used yet) |

When in doubt, use `OPERATIONAL`.

Then run:

```bash
yarn prisma generate
```

### Step 3: Use the flag in code

**Client-side (React components):**

```typescript
import { useFlagMap } from "@calcom/features/flags/context/provider";

function MyComponent() {
  const flags = useFlagMap();

  if (!flags["my-new-flag"]) return null;
  // render feature...
}
```

**Server-side (global flag check):**

Resolve the feature repository via the DI container and call `checkIfFeatureIsEnabledGlobally`:

```typescript
import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";

const featureRepository = getFeatureRepository();
const isEnabled = await featureRepository.checkIfFeatureIsEnabledGlobally("my-new-flag");
if (!isEnabled) return;
```

**Server-side (team-level flag check):**

Use the team feature repository to check if a specific team has a flag enabled:

```typescript
import { getTeamFeatureRepository } from "@calcom/features/di/containers/TeamFeatureRepository";

const teamFeatureRepository = getTeamFeatureRepository();
const isEnabled = await teamFeatureRepository.checkIfTeamHasFeature(teamId, "my-new-flag");
if (!isEnabled) return;
```

**Client-side (team-level flags):**

Use the `useIsFeatureEnabledForTeam` hook:

```typescript
import { useIsFeatureEnabledForTeam } from "@calcom/features/flags/hooks/useIsFeatureEnabledForTeam";

const isEnabled = useIsFeatureEnabledForTeam({ teamFeatures, teamId, feature: "my-new-flag" });
```

### Checklist (Internal Flag)

- [ ] Added key to `AppFlags` in `packages/features/flags/config.ts`
- [ ] Created a Prisma migration to seed the flag in the `Feature` table
- [ ] Ran `yarn prisma generate`
- [ ] Used the flag in code via `useFlagMap` (client) or `checkIfFeatureIsEnabledGlobally` (server)

---

## How to Add a Public Feature Opt-In

A feature opt-in requires an internal feature flag **plus** additional configuration. Follow all the internal flag steps above first, then continue below.

> For full details on config fields, policies, scopes, and architecture, see `packages/features/feature-opt-in/GUIDE.md`.

### Step 1: Complete the internal flag steps

Follow the "How to Add an Internal Feature Flag" section above. Set `enabled` to `true` in the migration.

Note: setting `enabled: true` in the `Feature` table does **not** make the feature globally available. It only makes the feature _visible_ in the opt-in UI so users can choose to enable it. The actual gating is handled by `FeatureOptInService`, which resolves per-user/team/org state. If you later set `enabled` to `false` in the `Feature` table, it acts as a kill switch — the feature disappears from the opt-in list entirely and is disabled for everyone.

### Step 2: Register the feature in the opt-in config

Open `packages/features/feature-opt-in/config.ts` and add an entry to `OPT_IN_FEATURES`:

```typescript
export const OPT_IN_FEATURES: OptInFeatureConfig[] = [
  // ... existing features ...
  {
    slug: "my-new-feature",
    i18n: {
      title: "my_new_feature_title",
      name: "my_new_feature_name",
      description: "my_new_feature_description",
    },
    bannerImage: {
      src: "/opt_in_banner_my_new_feature.png",
      width: 548,
      height: 348,
    },
    policy: "permissive",
    scope: ["org", "team", "user"],
    displayLocations: ["settings"],
  },
];
```

**Choosing a policy:**

The policy controls how `computeEffectiveStateAcrossTeams` (in `packages/features/feature-opt-in/lib/computeEffectiveState.ts`) resolves the final enabled/disabled state across the org → team → user hierarchy:

- `permissive` -- a user can enable the feature for themselves. The feature is only blocked if the org disables it, or if **every** team the user belongs to disables it. Good for low-risk features a user can safely try on their own (e.g. a UI redesign).
- `strict` -- a user **cannot** self-enable. An org or team admin must explicitly enable it first, and **any** single disable (org or any team) blocks the feature. Good for features that affect shared workflows where an individual opting in could cause confusion (e.g. a change to how round-robin scheduling works).

### Step 3: Add i18n translations

Add keys to `packages/i18n/locales/en/common.json`:

```json
{
  "my_new_feature_title": "Try My New Feature",
  "my_new_feature_name": "My New Feature",
  "my_new_feature_description": "A description of what this feature does and why users should try it."
}
```

### Step 4: Add the banner image

If using the `"banner"` display location, place the image in `public/` matching `bannerImage.src`.

### Step 5 (Optional): Add Formbricks feedback

See the `formbricks` config in `packages/features/feature-opt-in/GUIDE.md` (Step 6).

### Step 6: Use the opt-in state in code

The opt-in state resolution (org > team > user with policy logic) is handled by `FeatureOptInService`. Use it to check the effective opt-in state rather than just the global flag.

**Server-side example** (from the bookings page):

```typescript
import { getFeatureOptInService } from "@calcom/features/di/containers/FeatureOptInService";

const featureOptInService = getFeatureOptInService();
const featureStates = await featureOptInService.resolveFeatureStates({
  userId,
  featureIds: ["my-new-feature"],
});

const isEnabled = featureStates["my-new-feature"]?.effectiveEnabled ?? false;
```

`resolveFeatureStates` evaluates the full scope hierarchy (org > team > user) and the configured policy, returning an object keyed by feature slug. Check `effectiveEnabled` to determine if the feature is active for the given user.

### Checklist (Feature Opt-In)

- [ ] Completed all internal flag steps (AppFlags, migration with `enabled: true` so the feature appears in the opt-in UI, prisma generate)
- [ ] Added entry to `OPT_IN_FEATURES` in `packages/features/feature-opt-in/config.ts`
- [ ] Added i18n keys for `title`, `name`, and `description`
- [ ] Added banner image to `public/` (if using `"banner"` display)
- [ ] Chose the appropriate policy (`permissive` or `strict`)
- [ ] Set the correct scopes (`org`, `team`, `user`)
- [ ] (Optional) Configured Formbricks feedback survey

---

## Feature Opt-In Lifecycle Policy

When shipping a new feature behind opt-in, follow this lifecycle:

### Phase 1: Ship behind opt-in (Day 0)
- Deploy the feature gated by the opt-in flag
- Surface it via banner and/or settings page so users can discover and try it
- Target enterprise users for early feedback

### Phase 2: Collect feedback (Days 1-30)
- Monitor adoption via opt-in states
- Use Formbricks surveys (if configured) to gather structured feedback
- Iterate quickly on issues reported by early adopters

### Phase 3: Enable globally and clean up (by Day ~30)
- Once the feature is validated, enable the flag globally for all users
- Remove the conditional code paths (the `if (flag)` checks) from the codebase
- Remove the entry from `OPT_IN_FEATURES` in `config.ts`
- Clean up the associated i18n keys and banner images

**Target: complete the full cycle within one month of initial release.** The opt-in period is meant to be short-lived. Lingering conditional code increases complexity and maintenance burden. If a feature cannot be globally enabled within a month, escalate to discuss whether the feature needs redesign or should be reverted.
