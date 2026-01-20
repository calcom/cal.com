# Formbricks Delayed Tracking Plan

This document outlines the implementation plan for adding delayed Formbricks event tracking after a user opts into a feature.

## Overview

When a user opts into a feature (like "bookings-v3"), we want to track a Formbricks event after they've had time to experience the feature. This allows us to show surveys at the right moment - after the user has actually used the feature, not immediately upon opt-in.

## Current State

### localStorage Structure
Currently, `useFeatureOptInBanner` uses two localStorage keys:
- `feature-opt-in-dismissed`: `{ "feature-id": true }` - tracks dismissed banners
- `feature-opt-in-enabled`: `{ "feature-id": true }` - tracks opted-in features (boolean)

### OPT_IN_FEATURES Config
The `OptInFeatureConfig` interface in `packages/features/feature-opt-in/config.ts` has no Formbricks-related fields.

---

## Proposed Changes

### 1. Extend `OptInFeatureConfig` Interface

**File:** `packages/features/feature-opt-in/config.ts`

Add optional `formbricks` configuration to the interface:

```typescript
export interface OptInFeatureConfig {
  slug: FeatureId;
  i18n: {
    title: string;
    name: string;
    description: string;
  };
  bannerImage: {
    src: string;
    width: number;
    height: number;
  };
  policy: OptInFeaturePolicy;
  scope?: OptInFeatureScope[];
  // NEW: Formbricks tracking configuration
  formbricks?: {
    /** The action name to track (e.g., "visit_bookings_v3_page") */
    actionName: string;
    /** Delay in milliseconds before tracking the action after opt-in */
    delayMs: number;
  };
}
```

### 2. Modify localStorage Structure

**File:** `apps/web/modules/feature-opt-in/hooks/useFeatureOptInBanner.ts`

Change `feature-opt-in-enabled` from storing booleans to storing timestamps:

**Before:**
```typescript
{ "bookings-v3": true }
```

**After:**
```typescript
{ "bookings-v3": 1705766400000 }  // Unix timestamp in milliseconds
```

**Changes required:**
- Update `featuresMapSchema` from `z.record(z.string(), z.boolean())` to `z.record(z.string(), z.number())`
- Update `setFeatureInMap` to store `Date.now()` instead of `true`
- Update `isFeatureInMap` to check for truthy number value
- Add new helper `getFeatureOptInTimestamp` to retrieve the timestamp

### 3. Add New localStorage Key for Tracking State

Add a third localStorage key to track which features have already had their Formbricks action tracked:

- `feature-opt-in-tracked`: `{ "feature-id": true }` - prevents re-tracking

### 4. Integrate Formbricks Tracking in `useFeatureOptInBanner`

**File:** `apps/web/modules/feature-opt-in/hooks/useFeatureOptInBanner.ts`

Add a `useEffect` within the hook that:
1. Checks if the feature has Formbricks config
2. Reads the opt-in timestamp from localStorage
3. Checks if the feature has already been tracked
4. If enough time has passed since opt-in and not yet tracked:
   - Calls `trackFormbricksAction(config.formbricks.actionName)`
   - Marks the feature as tracked in localStorage

```typescript
useEffect(() => {
  if (!featureConfig?.formbricks) return;
  
  const optInTimestamp = getFeatureOptInTimestamp(featureId);
  if (!optInTimestamp) return;
  
  const alreadyTracked = isFeatureInMap(TRACKED_STORAGE_KEY, featureId);
  if (alreadyTracked) return;
  
  const timeSinceOptIn = Date.now() - optInTimestamp;
  const { delayMs, actionName } = featureConfig.formbricks;
  
  if (timeSinceOptIn >= delayMs) {
    // Delay has passed, track immediately
    trackFormbricksAction(actionName);
    setFeatureInMap(TRACKED_STORAGE_KEY, featureId, true);
  } else {
    // Set a timeout for the remaining time
    const remainingTime = delayMs - timeSinceOptIn;
    const timer = setTimeout(() => {
      trackFormbricksAction(actionName);
      setFeatureInMap(TRACKED_STORAGE_KEY, featureId, true);
    }, remainingTime);
    
    return () => clearTimeout(timer);
  }
}, [featureId, featureConfig]);
```

---

## Files to Modify

1. **`packages/features/feature-opt-in/config.ts`**
   - Add `formbricks` field to `OptInFeatureConfig` interface

2. **`apps/web/modules/feature-opt-in/hooks/useFeatureOptInBanner.ts`**
   - Change schema from boolean to number (timestamp)
   - Add `TRACKED_STORAGE_KEY` constant
   - Add `getFeatureOptInTimestamp` helper function
   - Add `useEffect` for Formbricks tracking logic
   - Import `trackFormbricksAction` from formbricks-client

---

## Example Usage

When adding a new opt-in feature with Formbricks tracking:

```typescript
// In config.ts
export const OPT_IN_FEATURES: OptInFeatureConfig[] = [
  {
    slug: "bookings-v3",
    i18n: {
      title: "bookings_v3_title",
      name: "bookings_v3_name",
      description: "bookings_v3_description",
    },
    bannerImage: {
      src: "/opt_in_banner_bookings_v3.png",
      width: 548,
      height: 348,
    },
    policy: "permissive",
    scope: ["org", "team", "user"],
    formbricks: {
      actionName: "visit_bookings_v3_page",
      delayMs: 86400000, // 24 hours
    },
  },
];
```

---

## Testing Considerations

1. **Unit tests for localStorage helpers:**
   - Test timestamp storage and retrieval
   - Test tracking state management

2. **Unit tests for the tracking logic:**
   - Test that tracking fires after delay
   - Test that tracking doesn't fire before delay
   - Test that tracking only fires once (no re-tracking)
   - Test cleanup of setTimeout on unmount

3. **Integration considerations:**
   - The actual Formbricks tracking will only work if Formbricks env vars are configured
   - The hook should gracefully handle missing Formbricks configuration
