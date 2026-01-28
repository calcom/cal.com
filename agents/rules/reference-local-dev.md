---
title: Local Development Setup
impact: LOW
tags: reference, development, setup
---

## Local Development Setup

**Impact: LOW (Reference)**

Quick reference for local development in the Cal.com monorepo.

**Initial setup:**

```bash
# Install dependencies
yarn

# Copy environment file
cp .env.example .env

# Generate secrets
openssl rand -base64 32  # For NEXTAUTH_SECRET
openssl rand -base64 24  # For CALENDSO_ENCRYPTION_KEY (must be 32 chars for AES256)

# Configure in .env:
# - Postgres DATABASE_URL
# - Set DATABASE_DIRECT_URL to same value as DATABASE_URL
```

**Database setup:**

```bash
# Development - creates and applies migrations
yarn workspace @calcom/prisma db-migrate

# Production - applies existing migrations only
yarn workspace @calcom/prisma db-deploy
```

**Test users:**

When setting up a local development database, it creates users for you. Passwords are the same as usernames:

- `free:free`
- `pro:pro`

**Development servers:**

```bash
yarn dev    # Start dev server
yarn dx     # Dev with database setup
```

**Logging:**

Control logging verbosity by setting `NEXT_PUBLIC_LOGGER_LEVEL` in `.env`:

| Level | Value |
|-------|-------|
| silly | 0 |
| trace | 1 |
| debug | 2 |
| info | 3 |
| warn | 4 |
| error | 5 |
| fatal | 6 |

**After Prisma schema changes:**

```bash
yarn prisma generate  # Regenerate TypeScript types
```

**tRPC rebuild:**

After changes affecting tRPC components or pulling tRPC updates:

```bash
yarn prisma generate
cd packages/trpc && yarn build
```

This ensures type definitions are generated before building tRPC components.
