# Phase 1: Server-Side Foundation - Implementation Plan

## Overview

This plan implements Phase 1 of the Feature Opt-In System. The key design decision is to create a **separate `FeatureOptInRepository`** instead of extending the existing `FeaturesRepository`. This maintains separation of concerns:

- `FeaturesRepository` - Handles feature flag checks (existing)
- `FeatureOptInRepository` - Handles opt-in state management (new)

---

## TASK 1.1: Define explicit API types

**Create:** `packages/features/feature-opt-in/types.ts`

```typescript
/**
 * Explicit state for API/UI layer.
 * - "enabled": upsert row with enabled = true
 * - "disabled": upsert row with enabled = false
 * - "inherit": delete the row (inherit from higher level)
 */
export type FeatureState = "enabled" | "disabled" | "inherit";

export interface FeatureOptInStatus {
  featureId: string;
  slug: string;
  globalEnabled: boolean;
  userState: FeatureState;
  teamState: FeatureState;
  effectiveEnabled: boolean;
  teamExplicitlyDisabled: boolean;
}
```

---

## TASK 1.2: Create FeatureOptInRepository

### 1.2a: Interface

**Create:** `packages/features/feature-opt-in/feature-opt-in.repository.interface.ts`

```typescript
import type { FeatureState } from "./types";

export interface IFeatureOptInRepository {
  // Get user's feature state (returns row with enabled value, or null if no row)
  getUserFeatureState(userId: number, featureId: string): Promise<{ enabled: boolean } | null>;

  // Get team's feature state (returns row with enabled value, or null if no row)
  getTeamFeatureState(teamId: number, featureId: string): Promise<{ enabled: boolean } | null>;

  // Set user feature with tri-state logic
  setUserFeatureState(
    userId: number,
    featureId: string,
    state: FeatureState,
    assignedBy: number
  ): Promise<void>;

  // Set team feature with tri-state logic
  setTeamFeatureState(
    teamId: number,
    featureId: string,
    state: FeatureState,
    assignedBy: number
  ): Promise<void>;

  // Get all feature states for a user (for settings page)
  getAllUserFeatureStates(userId: number): Promise<Array<{ featureId: string; enabled: boolean }>>;

  // Get all feature states for a team (for settings page)
  getAllTeamFeatureStates(teamId: number): Promise<Array<{ featureId: string; enabled: boolean }>>;

  // Get all features from Feature table
  getAllFeatures(): Promise<Array<{ slug: string; enabled: boolean }>>;
}
```

### 1.2b: Implementation

**Create:** `packages/features/feature-opt-in/PrismaFeatureOptInRepository.ts`

- Constructor takes `PrismaClient`
- Implements all interface methods
- Uses tri-state logic:
  - `"enabled"` → upsert with `enabled = true`
  - `"disabled"` → upsert with `enabled = false`
  - `"inherit"` → delete the row
- Uses single object params for all methods

---

## TASK 1.3: Create FeatureOptInService

**Create:** `packages/features/feature-opt-in/FeatureOptInService.ts`

```typescript
export class FeatureOptInService {
  constructor(
    private featuresRepository: IFeaturesRepository,
    private featureOptInRepository: IFeatureOptInRepository
  ) {}

  async getFeatureStatusForUser(
    userId: number,
    teamId: number | null,
    featureId: string
  ): Promise<FeatureOptInStatus>;

  async listFeaturesForUser(userId: number, teamId: number | null): Promise<FeatureOptInStatus[]>;

  async listFeaturesForTeam(teamId: number): Promise<FeatureOptInStatus[]>;

  async setUserFeatureState(
    userId: number,
    featureId: string,
    state: FeatureState,
    assignedBy: number
  ): Promise<void>;

  async setTeamFeatureState(
    teamId: number,
    featureId: string,
    state: FeatureState,
    assignedBy: number
  ): Promise<void>;
}
```

**Business Logic:**

- `effectiveEnabled` = `globalEnabled && !teamExplicitlyDisabled && (userState === "enabled" || (userState === "inherit" && teamState !== "disabled"))`
- `teamExplicitlyDisabled` = true only when `TeamFeatures.enabled = false`

---

## TASK 1.4: Create tRPC router

### 1.4a: Router

**Create:** `packages/trpc/server/routers/viewer/featureOptIn/_router.ts`

Endpoints:

- `listForUser` - Get all features with states for current user's settings page
- `listForTeam` - Get all features with states for team settings page
- `listForOrganization` - Get all features with states for org settings page
- `setUserState` - Set user's feature state
- `setTeamState` - Set team's feature state (requires team admin)
- `setOrganizationState` - Set org's feature state (requires org admin)

### 1.4b: Wire into viewer router

**Modify:** `packages/trpc/server/routers/viewer/_router.tsx`

- Import and add `featureOptIn: featureOptInRouter`

---

## TASK 1.5: Define feature allowlist config

**Create:** `packages/features/feature-opt-in/config.ts`

```typescript
export interface OptInFeatureConfig {
  slug: string;
  titleI18nKey: string;
  descriptionI18nKey: string;
  learnMoreUrl?: string;
  // Banner config will be added in Phase 4
}

export const OPT_IN_FEATURES: OptInFeatureConfig[] = [
  // To be populated with actual features
];

export function getOptInFeatureConfig(slug: string): OptInFeatureConfig | undefined {
  return OPT_IN_FEATURES.find((f) => f.slug === slug);
}
```

---

## TASK 1.6: Add integration tests

**Create:** `packages/features/feature-opt-in/service.integration-test.ts`

Test cases:

1. Returns `effectiveEnabled = false` when global feature is disabled
2. Returns `effectiveEnabled = false` when team has `enabled = false`
3. Returns `effectiveEnabled = true` when user has `enabled = true` and team has no row
4. Returns `teamExplicitlyDisabled = true` only when team row exists with `enabled = false`
5. `setUserFeatureState("inherit")` deletes the row
6. `setUserFeatureState("enabled")` upserts with `enabled = true`
7. Team-level tests for `getFeatureStatusForTeam`

---

## File Summary

| Task | File                                                                  | Action |
| ---- | --------------------------------------------------------------------- | ------ |
| 1.1  | `packages/features/feature-opt-in/types.ts`                           | Create |
| 1.2a | `packages/features/feature-opt-in/FeatureOptInRepositoryInterface.ts` | Create |
| 1.2b | `packages/features/feature-opt-in/PrismaFeatureOptInRepository.ts`    | Create |
| 1.3  | `packages/features/feature-opt-in/FeatureOptInService.ts`             | Create |
| 1.4a | `packages/trpc/server/routers/viewer/featureOptIn/_router.ts`         | Create |
| 1.4b | `packages/trpc/server/routers/viewer/_router.tsx`                     | Modify |
| 1.5  | `packages/features/feature-opt-in/config.ts`                          | Create |
| 1.6  | `packages/features/feature-opt-in/service.integration-test.ts`        | Create |

---

## Verification

After implementation:

```bash
yarn type-check:ci --force
TZ=UTC yarn test packages/features/feature-opt-in/
```
