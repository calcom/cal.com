---
title: Prisma Schema and Migrations
impact: HIGH
impactDescription: Schema changes affect all downstream code and deployments
tags: prisma, database, migrations, schema
---

# Prisma Schema and Migrations

## After Schema Changes

After making changes to the Prisma schema in Cal.com and creating migrations, you need to run:

```bash
yarn prisma generate
```

This updates the TypeScript types. This is especially important:
- When switching Node.js versions
- After adding new fields to models
- After pulling changes that include Prisma schema updates

## Creating Migrations

```bash
# Development migration
npx prisma migrate dev --name migration_name

# Production deployment
yarn workspace @calcom/prisma db-deploy
```

## Timestamp Fields

When adding timestamp fields like `createdAt` and `updatedAt`:
- Do not set default values if you want existing records to have null values
- Only new records should get timestamps automatically
- For `updatedAt` fields, ensure they're updated when records are modified

## Squash Migrations

Whenever you change the schema.prisma file, remember to always consolidate migrations by squashing them as declared in the [Prisma docs](https://www.prisma.io/docs/orm/prisma-migrate/workflows/squashing-migrations).

This helps maintain a clean migration history and prevents accumulation of multiple migration files.

## Enum Generator Errors

If you encounter enum generator errors during the Prisma generate step (like "Cannot find module './enum-generator.ts'"), run `yarn install` first before trying to generate.

## Cache-Related Features

When implementing cache-related features that require timestamp tracking, always update the database schema first before modifying application code that references those fields.
