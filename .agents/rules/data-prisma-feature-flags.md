---
title: Feature Flag Seeding
impact: MEDIUM
impactDescription: Proper feature flag setup enables controlled rollouts
tags: prisma, feature-flags, migrations
---

# Feature Flag Seeding

## Creating Feature Flag Migrations

To seed new feature flags in Cal.com, create a Prisma migration:

```bash
yarn prisma migrate dev --create-only --name seed_[feature_name]_feature
```

## Migration File Location

The migration file should be placed in `packages/prisma/migrations/` with a timestamp prefix format:

```
20250724210733_seed_calendar_cache_sql_features/migration.sql
```

## SQL Structure

Follow the pattern from existing feature seeding migrations like:
`packages/prisma/migrations/20241216000000_add_calendar_cache_serve/migration.sql`

```sql
INSERT INTO "Feature" ("slug", "enabled", "type", "description", "createdAt", "updatedAt")
VALUES
  ('your-feature-slug', false, 'OPERATIONAL', 'Description of feature', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
```

The migration should INSERT the new features into the `Feature` table with:
- Appropriate type (like `OPERATIONAL`)
- Default `enabled` status for manual team enablement
