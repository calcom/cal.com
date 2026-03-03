# Feature Opt-In System Guide

This guide explains the Feature Opt-In system and walks you through adding a new opt-in feature.

## Overview

The Feature Opt-In system lets users, teams, and organizations selectively enable experimental or new features. It supports:

- **Three scopes**: `org`, `team`, and `user`
- **Two policies**: `permissive` and `strict`
- **Two display locations**: `settings` page and `banner` notification
- **Auto opt-in**: Entities can automatically opt into new features
- **Formbricks feedback**: Optional delayed survey after opt-in

Each feature is backed by a **feature flag** (defined in `packages/features/flags/config.ts`) and configured in this directory's `config.ts`.

---

## Architecture

```
packages/features/feature-opt-in/
  config.ts                  # Feature registry (OPT_IN_FEATURES array)
  types.ts                   # Shared types (policy, scope, hooks interface)
  lib/
    computeEffectiveState.ts # Determines if a feature is enabled for a user
    applyAutoOptIn.ts        # Transforms "inherit" -> "enabled" when auto opt-in is on
  services/
    IFeatureOptInService.ts  # Service interface (resolve states, set states, eligibility)
    FeatureOptInService.ts   # Service implementation
  di/
    tokens.ts                # Dependency injection tokens
```

### How State Resolution Works

When determining if a feature is enabled for a user, the system evaluates a hierarchy:

1. **Global flag** (kill switch) - if `false`, the feature is completely off and won't even appear in the opt-in list
2. **Org state** - `enabled`, `disabled`, or `inherit`
3. **Team states** - each team the user belongs to has its own state
4. **User state** - the user's own preference

The `computeEffectiveStateAcrossTeams` function resolves the final state based on the feature's **policy**.

### Policies

| Policy | User opt-in alone? | Disable behavior | Use case |
|---|---|---|---|
| `permissive` | Yes, user can self-enable | Only blocked if **ALL** teams disable | Features safe for individual adoption |
| `strict` | No, requires org/team enable | **ANY** disable blocks | Features needing admin approval |

### Scopes

- **`org`**: Configurable at the organization level
- **`team`**: Configurable at the team level
- **`user`**: Configurable at the user level

A feature's `scope` field restricts where it appears. Omitting `scope` makes it available at all levels.

### Display Locations

- **`settings`**: Feature appears in the Settings > Features page
- **`banner`**: Feature appears as a floating banner on relevant pages

Defaults to `["settings"]` if omitted.

---

## How to Add a New Feature Opt-In

### Step 1: Add a Feature Flag

Open `packages/features/flags/config.ts` and add your feature to the `AppFlags` type:

```typescript
export type AppFlags = {
  // ... existing flags ...
  "my-new-feature": boolean; // <-- Add your flag here
};
```

This flag acts as a global kill switch. When set to `false` in the `Feature` table, the feature is completely hidden — it won't appear in the opt-in list or be available for anyone. Set it to `true` to make the feature available for opt-in.

### Step 2: Create a Prisma Migration to Seed the Feature Flag

The feature flag must exist in the `Feature` table for the system to work. Create a migration to seed it:

```bash
yarn prisma migrate dev --create-only --name seed_my_new_feature
```

This creates an empty migration file in `packages/prisma/migrations/`. Edit the generated `migration.sql` to insert the flag:

```sql
INSERT INTO "Feature" (slug, enabled, description, "type")
VALUES ('my-new-feature', true, 'Description of what this feature does.', 'OPERATIONAL')
ON CONFLICT (slug) DO NOTHING;
```

- Set `enabled` to `true` — this makes the feature visible in the opt-in list. Setting it to `false` acts as a global kill switch that hides the feature entirely
- The opt-in system controls per-user/team/org enablement separately via the state hierarchy (org → team → user)
- Use `ON CONFLICT (slug) DO NOTHING` so the migration is safe to re-run
- The `type` should be `'OPERATIONAL'`

See `packages/prisma/migrations/20260109090244_seed_sidebar_tips_feature/migration.sql` for a real example.

### Step 3: Register the Feature in the Opt-In Config

Open `packages/features/feature-opt-in/config.ts` and add a new entry to the `OPT_IN_FEATURES` array:

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

#### Config Fields Reference

| Field | Required | Description |
|---|---|---|
| `slug` | Yes | Must match a key in `AppFlags` (the `FeatureId` type) |
| `i18n.title` | Yes | i18n key for the feature title (displayed in banner/dialog headings) |
| `i18n.name` | Yes | i18n key for the feature name (displayed in settings lists) |
| `i18n.description` | Yes | i18n key for the feature description |
| `bannerImage.src` | Yes | Path to the banner image (placed in `public/`) |
| `bannerImage.width` | Yes | Image width in pixels |
| `bannerImage.height` | Yes | Image height in pixels |
| `policy` | Yes | `"permissive"` or `"strict"` (see [Policies](#policies)) |
| `scope` | No | Array of `"org"`, `"team"`, `"user"`. Omit to allow all scopes |
| `displayLocations` | No | Array of `"settings"`, `"banner"`. Defaults to `["settings"]` |
| `showBannerOn` | No | `"all"`, `"mobile"`, or `"desktop"`. Defaults to `"all"` |
| `formbricks` | No | Feedback survey config (see [Formbricks Feedback](#step-6-optional-add-formbricks-feedback)) |

### Step 4: Add i18n Translations

Add translation keys for your feature. The keys referenced in `i18n.title`, `i18n.name`, and `i18n.description` must exist in the translation files. For example:

```json
{
  "my_new_feature_title": "Try My New Feature",
  "my_new_feature_name": "My New Feature",
  "my_new_feature_description": "A description of what this feature does and why users should try it."
}
```

### Step 5: Add the Banner Image

If your feature uses the `"banner"` display location, add a banner image to the `public/` directory:

- Path should match `bannerImage.src` (e.g., `public/opt_in_banner_my_new_feature.png`)
- Recommended dimensions: match what you set in `bannerImage.width` and `bannerImage.height`

### Step 6 (Optional): Add Formbricks Feedback

To collect user feedback after they opt in, add a `formbricks` config:

```typescript
{
  slug: "my-new-feature",
  // ... other fields ...
  formbricks: {
    waitAfterDays: 3,           // Days to wait after opt-in before showing survey
    showOn: "desktop",          // "all" | "desktop" | "mobile"
    surveyId: "<your-survey-id>",
    questions: {
      ratingQuestionId: "<rating-question-id>",
      commentQuestionId: "<comment-question-id>",
    },
    titleKey: "my_feature_feedback_title",         // Optional i18n key
    descriptionKey: "my_feature_feedback_description", // Optional i18n key
  },
}
```

You'll need to create the survey in Formbricks first and use the IDs it provides.

After completing the steps above, run `yarn prisma generate` to update the TypeScript types, then squash migrations if needed per the [Prisma docs](https://www.prisma.io/docs/orm/prisma-migrate/workflows/squashing-migrations).

---

## Choosing the Right Policy

### Use `permissive` when:

- The feature is safe for individual users to try on their own
- You want maximum adoption and low friction
- Disabling should require consensus (all teams must disable)

### Use `strict` when:

- The feature affects team/org workflows and needs admin approval
- Any admin should be able to block it for their scope
- User self-service enablement should not be allowed without admin buy-in

---

## Example: Full Feature Config

Here is the existing `bookings-v3` config as a real-world reference:

```typescript
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
  displayLocations: ["banner", "settings"],
  showBannerOn: "desktop",
  scope: ["org", "team", "user"],
  formbricks: {
    waitAfterDays: 3,
    showOn: "desktop",
    surveyId: "cml6ps4f0psk9ad019a2kzedz",
    questions: {
      ratingQuestionId: "ajt82ni0hue3x5qkltj9t359",
      commentQuestionId: "kwjw0g7vqkgd5w9s61dba8de",
    },
    titleKey: "bookings_v3_feedback_title",
    descriptionKey: "bookings_v3_feedback_description",
  },
}
```

---

## Quick Checklist

- [ ] Added feature flag to `AppFlags` in `packages/features/flags/config.ts`
- [ ] Created a Prisma migration to seed the flag in the `Feature` table
- [ ] Added entry to `OPT_IN_FEATURES` in `packages/features/feature-opt-in/config.ts`
- [ ] Added i18n translation keys for `title`, `name`, and `description`
- [ ] Added banner image to `public/` (if using `"banner"` display location)
- [ ] Chose the appropriate policy (`permissive` or `strict`)
- [ ] Set the correct scopes (`org`, `team`, `user`)
- [ ] (Optional) Configured Formbricks feedback survey
- [ ] Ran `yarn prisma generate` to update TypeScript types
- [ ] Verified the feature flag is enabled in the database for your environment
