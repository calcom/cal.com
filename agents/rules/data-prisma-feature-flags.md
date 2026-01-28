---
title: Seeding Feature Flags
impact: MEDIUM
tags: prisma, feature-flags, migrations
---

## Seeding Feature Flags

**Impact: MEDIUM**

To seed new feature flags in Cal.com, create a Prisma migration with SQL inserts.

**Creating the migration:**

```bash
yarn prisma migrate dev --create-only --name seed_[feature_name]_feature
```

**Migration file location:**

`packages/prisma/migrations/[timestamp]_seed_[feature_name]_feature/migration.sql`

**Example migration SQL:**

```sql
-- Seed new feature flags
INSERT INTO "Feature" ("slug", "enabled", "type", "description", "stale")
VALUES
  ('calendar-cache-sql', false, 'OPERATIONAL', 'Enable SQL-based calendar cache', NULL),
  ('calendar-cache-read', false, 'OPERATIONAL', 'Enable reading from calendar cache', NULL)
ON CONFLICT ("slug") DO NOTHING;
```

**Key points:**

- Use `OPERATIONAL` type for features that can be enabled per team
- Set `enabled` to `false` by default for manual team enablement
- Use `ON CONFLICT DO NOTHING` to make migrations idempotent
- Follow existing patterns in `packages/prisma/migrations/`

**Reference migration:**

See `packages/prisma/migrations/20241216000000_add_calendar_cache_serve/migration.sql` for structure examples.
