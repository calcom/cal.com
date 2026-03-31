# How to Add a New Experiment

This guide walks through every step needed to ship a new A/B experiment end-to-end.

## Overview

The experiment framework has two sides:

- **Code config** (`config.ts`) — defines the experiment slug, target audience, and variant slugs. This is the source of truth for which experiments exist.
- **Database state** — stores runtime state (status, variant weights, winner) plus display metadata (label, description). Experiments appear in the DB via a seed migration.

## Step 1: Register the experiment in `config.ts`

Add an entry to the `EXPERIMENTS` object in `packages/features/experiments/config.ts`:

```typescript
export const EXPERIMENTS = {
  // existing experiments...

  "your-experiment-slug": {
    variants: ["variant_name"],
    target: "logged-in",
  },
} as const;
```

**Fields:**

| Field | Description |
|-------|-------------|
| `slug` (key) | Unique identifier. Use kebab-case. This is the primary key in the DB. |
| `variants` | Array of variant slugs (excluding control). Users not assigned to any variant are in the control group. |
| `target` | `"logged-in"` for authenticated users (deterministic bucketing by userId), `"anonymous"` for unauthenticated users (random bucketing via localStorage). |

## Step 2: Create a seed migration

The experiment row must exist in the database before admins can interact with it. Create a migration to seed it:

```bash
npx prisma migrate dev --create-only --name seed_your_experiment_slug
```

Then write the SQL:

```sql
INSERT INTO "Experiment" ("slug", "label", "description", "status", "createdAt", "updatedAt")
VALUES ('your-experiment-slug', 'Your Experiment', 'Short description of what this tests', 'DRAFT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ExperimentVariant" ("experimentSlug", "variantSlug", "label", "weight")
VALUES ('your-experiment-slug', 'variant_name', 'Variant Name', 0)
ON CONFLICT ("experimentSlug", "variantSlug") DO NOTHING;
```

Add one `INSERT` per variant. The weight starts at 0 (control gets all traffic) until an admin adjusts it. Labels are displayed in the admin UI; if omitted, the slug is shown instead.

## Step 3: Use the experiment in your component

> **Note:** `ExperimentProvider` is already wired up at the layout level (`apps/web/app/(use-page-wrapper)/layout.tsx`). You do NOT need to wrap individual pages — just use the hook directly.
>
> **Coverage:** The provider covers all authenticated app pages under `(use-page-wrapper)/`. Public pages like booking pages (`(booking-page-wrapper)/`) and routing forms (`routing-forms/`) are NOT covered. If you need to run `target: "anonymous"` experiments on those pages, you'll need to add `ExperimentProvider` to their layouts separately.

```typescript
import { useExperiment } from "@calcom/web/modules/experiments/hooks/useExperiment";

function MyComponent({ open }: { open: boolean }) {
  const { variant, trackExposure, trackOutcome } = useExperiment("your-experiment-slug");

  // Track exposure when the variant is actually visible (not on mount)
  useEffect(() => {
    if (open) trackExposure();
  }, [open, trackExposure]);

  // variant is null for control group, or the variant slug string
  if (variant === "variant_name") {
    return <NewVariantUI onSuccess={trackOutcome} />;
  }

  return <ControlUI onSuccess={trackOutcome} />;
}
```

### `useExperiment` API

```typescript
const { variant, trackExposure, trackOutcome } = useExperiment(slug, options?);
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `variant` | `string \| null` | The assigned variant slug, or `null` for control group / inactive experiment. |
| `trackExposure` | `() => void` | Fires a `experiment_exposure` event to PostHog. Must be called manually or enabled via `trackExposure: true` option. |
| `trackOutcome` | `() => void` | Fires a `experiment_outcome` event to PostHog. Call this when the user completes the action you're measuring. |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `trackExposure` | `false` | Set to `true` to automatically track exposure on mount. Leave `false` (default) and call `trackExposure()` manually when the variant is actually visible (e.g. when a dialog opens). |

## Step 4: Track the outcome

Call `trackOutcome()` when the user completes the desired action. This is what you'll compare between control and variant in PostHog.

```typescript
const { variant, trackOutcome } = useExperiment("your-experiment-slug");

const handleUpgrade = () => {
  trackOutcome();
  // ... rest of the upgrade logic
};
```

**Both `trackExposure` and `trackOutcome` send PostHog events with these properties:**
- `experiment` — the experiment slug
- `variant` — the assigned variant (or `"control"` for the control group)

## Step 5: Add translations

If your variant changes user-facing text, add translation keys to `packages/i18n/locales/en/common.json`:

```json
{
  "your_new_translation_key": "Your new text"
}
```

## Step 6: Activate via the admin UI

1. Navigate to `/settings/admin/experiments`
2. Find your experiment in the list (it appears from the seed migration in Step 2)
3. Set variant weights (e.g. 50% control, 50% variant)
4. Change status from DRAFT to RUNNING

## Step 7: Monitor in PostHog

Use PostHog dashboards to track experiment performance:

- **Exposure events**: `experiment_exposure` with property `experiment = "your-experiment-slug"`
- **Outcome events**: `experiment_outcome` with property `experiment = "your-experiment-slug"`
- **Conversion rate**: Outcome count / Exposure count, grouped by `variant` property

## Step 8: Conclude the experiment

Once you have statistically significant results:

1. In the admin UI, click **Set Winner** on the winning variant
   - This sets the status to `ROLLED_OUT` and records the winner
2. Update the code to permanently show the winning variant
3. Remove the `useExperiment` call and the losing variant's code
4. Remove the entry from `config.ts`

## How bucketing works

### Logged-in users (`target: "logged-in"`)

Bucketing is **deterministic and server-side**. The user's variant is computed from `md5(userId + ":" + experimentSlug) % 100` and passed to the client via `ExperimentProvider`. The same user always gets the same variant — no randomness, no flicker.

### Anonymous users (`target: "anonymous"`)

Bucketing is **random and client-side**. Each experiment gets a random bucket number (0–99) on first encounter, persisted in `localStorage` under the `exp_anon_buckets` key. The bucket is stable across tabs and sessions — same browser always gets the same variant. No PII is stored, just random numbers.

### Enterprise users

Enterprise plan users are always excluded from experiments (they get `null` / control).

## File reference

```
packages/features/experiments/
├── config.ts                        # Experiment definitions (source of truth)
├── types.ts                         # Status enum, Zod schemas
├── lib/
│   ├── bucketing.ts                 # hashUserToPercent, assignVariant
│   └── tracking.ts                  # PostHog event helpers
├── services/
│   └── ExperimentService.ts         # Business logic
├── repositories/
│   ├── IExperimentRepository.ts     # Interface
│   ├── PrismaExperimentRepository.ts
│   └── CachedExperimentRepository.ts
└── di/                              # Dependency injection wiring

apps/web/modules/experiments/
├── provider.tsx                     # ExperimentProvider context
├── hooks/
│   └── useExperiment.ts             # useExperiment() hook
└── getCachedExperimentData.ts       # Server entry point (caches user plan lookup, 1h TTL)
```
