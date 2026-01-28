---
title: Prisma Schema and Migrations
impact: HIGH
tags: prisma, database, migrations
---

## Prisma Schema and Migrations

**Impact: HIGH**

Follow these practices when working with Prisma schema changes in Cal.com.

**After schema changes, always run:**

```bash
yarn prisma generate
```

This regenerates TypeScript types. Required when:
- Switching Node.js versions
- Adding new fields to models
- Pulling changes with Prisma schema updates
- Seeing missing enum errors (like `CreationSource.WEBAPP`)

**If you encounter enum generator errors:**

```bash
# Error: Cannot find module './enum-generator.ts'
# Solution: Run yarn install first
yarn install
yarn prisma generate
```

**Creating migrations:**

```bash
# Development - creates and applies migration
yarn workspace @calcom/prisma db-migrate

# Or with specific name
npx prisma migrate dev --name migration_name

# Production - applies existing migrations
yarn workspace @calcom/prisma db-deploy
```

**Squash migrations:**

Always consolidate migrations by squashing them as declared in Prisma docs. This prevents accumulation of multiple migration files.

Reference: https://www.prisma.io/docs/orm/prisma-migrate/workflows/squashing-migrations

**Timestamp fields:**

For `createdAt` and `updatedAt` fields:
- Don't set defaults if existing records should have null values
- Only new records get timestamps automatically
- Ensure `updatedAt` is updated when records are modified
