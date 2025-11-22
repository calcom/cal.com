# A/B Testing Experiments

Core utilities for A/B testing experiments using database feature flags and PostHog analytics.

## Overview

This package provides A/B testing capabilities that integrate with:

- Database feature flags (`Feature` table with `type: EXPERIMENT`)
- PostHog analytics (without PostHog Features product)
- Support for user-level, team-level, and visitor-level experiments
- Both deterministic and random variant assignment

## Database Schema

### New Table: `ExperimentVariant`

Stores experiment variant assignments:

- `id` (uuid, primary key)
- `experimentSlug` (string) - references Feature slug
- `variant` (string) - variant name (e.g., "A", "B", "control", "treatment")
- `userId` (int?, nullable) - for user-level experiments
- `teamId` (int?, nullable) - for team-level experiments
- `visitorId` (string?, nullable) - for anonymous visitor experiments
- `assignmentType` (enum: 'DETERMINISTIC' | 'RANDOM')
- `assignedAt` (DateTime)
- `metadata` (Json?, optional)

### New Enum: `AssignmentType`

- `DETERMINISTIC` - Same user/team/visitor always gets same variant
- `RANDOM` - Random assignment each time

## Usage

### Get Experiment Variant

```typescript
import { getExperimentVariant } from "@calcom/features/experiments";
import { prisma } from "@calcom/prisma";

// Get variant for a user
const result = await getExperimentVariant(prisma, userId, "my-experiment-slug", { assignIfMissing: true });

if (result) {
  console.log(`Assigned variant: ${result.variant}`);
  console.log(`Assignment type: ${result.assignmentType}`);
  console.log(`Is new: ${result.isNewAssignment}`);
}
```

### Track Experiment Exposure

```typescript
import { trackExperimentExposureEvent } from "@calcom/features/experiments";

trackExperimentExposureEvent("my-experiment-slug", "treatment", "deterministic", {
  user_id: userId,
  page: "/booking",
});
```

### Track Experiment Conversion

```typescript
import { trackExperimentConversionEvent } from "@calcom/features/experiments";

trackExperimentConversionEvent("my-experiment-slug", "treatment", "deterministic", {
  conversionEvent: "booking_completed",
  user_id: userId,
  booking_id: bookingId,
});
```

### Get Variant and Track in One Call

```typescript
import { getVariantAndTrackExposure } from "@calcom/features/experiments";

const result = await getVariantAndTrackExposure(prisma, "my-experiment-slug", {
  userId,
  page: "/booking",
});
```

## Factory Pattern

When PostHog is disabled, use the factory pattern to fall back to feature flags:

```typescript
import { createExperimentVariantGetter } from "@calcom/features/experiments";
import { prisma } from "@calcom/prisma";

const experimentGetter = createExperimentVariantGetter(prisma);

// Get variant (falls back to feature flag if PostHog disabled)
const result = await experimentGetter.getVariant("my-experiment-slug", {
  userId: 123,
});

// Track exposure
await experimentGetter.trackExposure("my-experiment-slug", result.variant, result.assignmentType, {
  user_id: 123,
});
```

When PostHog is disabled:

- Returns `"treatment"` if feature flag is enabled globally
- Returns `"control"` if feature flag is disabled
- Assignment type is always `"deterministic"`

1. **Create Migration**: Run Prisma migration to create `ExperimentVariant` table

   ```bash
   yarn prisma migrate dev --name add_experiment_variant_table
   ```

2. **Generate Prisma Client**: Regenerate Prisma client

   ```bash
   yarn prisma generate
   ```

3. **Create Experiment Feature**: Add experiment to Feature table
   ```sql
   INSERT INTO "Feature" (slug, enabled, type, description)
   VALUES ('my-experiment-slug', true, 'EXPERIMENT', 'My A/B test experiment');
   ```

## Variant Assignment

### Deterministic Assignment

- Same user/team/visitor + experiment slug always gets the same variant
- Uses hash function: `hash(userId-experimentSlug)` → variant

### Random Assignment

- Each assignment call may return a different variant
- Uses random distribution based on configured percentages

### Configuration

Currently uses default configuration (50/50 split between "control" and "treatment").

To customize variants, you can:

1. Add `metadata` field to `Feature` table (future enhancement)
2. Create separate `ExperimentConfig` table (future enhancement)
3. Pass custom config via repository methods (future enhancement)

## PostHog Events

Events tracked to PostHog:

### `experiment_viewed`

- Triggered when user is assigned to or views an experiment variant
- Properties: `experiment_slug`, `variant`, `assignment_type`, `user_id`/`team_id`/`visitor_id`

### `experiment_conversion`

- Triggered when conversion event occurs
- Properties: `experiment_slug`, `variant`, `assignment_type`, `conversion_event`, `user_id`/`team_id`/`visitor_id`

## Files Structure

```
packages/features/experiments/
├── types.ts                          # TypeScript type definitions
├── experiments.repository.ts         # Database repository for experiments
├── lib/
│   ├── client/
│   │   └── posthog-tracker.ts       # Client-side PostHog tracker (React)
│   ├── server/
│   │   └── posthog-tracker.ts       # Server-side PostHog tracker (Node.js)
│   └── experiment-factory.ts        # Factory for experiments with PostHog fallback
├── utils/
│   ├── variant-assignment.ts        # Variant assignment logic
│   └── index.ts                     # Helper functions
└── index.ts                          # Barrel exports
```

## Next Steps

- Phase 2: React hooks (`useExperiment`, `useExperimentVariant`)
- Phase 3: Admin UI for creating/managing experiments
- Phase 4: Analytics dashboard integration
