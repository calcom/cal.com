---
title: Local Development Setup
impact: LOW
impactDescription: Reference guide for local development environment
tags: reference, development, setup
---

# Local Development Setup

## Initial Setup

```bash
# Install dependencies
yarn

# Set up environment
cp .env.example .env
```

## Environment Variables

Generate required secrets:

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# CALENDSO_ENCRYPTION_KEY (must be 32 characters for AES256)
openssl rand -base64 24
```

Configure in `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `DATABASE_DIRECT_URL` - Same as DATABASE_URL

## Database Setup

```bash
# Development
yarn workspace @calcom/prisma db-migrate

# Production
yarn workspace @calcom/prisma db-deploy
```

## Test Users

When setting up local development database, it creates test users. The passwords are the same as the username:
- `free:free`
- `pro:pro`

## Logging

Control logging verbosity by setting `NEXT_PUBLIC_LOGGER_LEVEL` in .env:
- 0: silly
- 1: trace
- 2: debug
- 3: info
- 4: warn
- 5: error
- 6: fatal

## API v2 Imports

If you need to import from `@calcom/features` or `@calcom/trpc` into `apps/api/v2`, use the platform-libraries package instead:

```typescript
// ✅ Good
import { SomeService } from "@calcom/platform-libraries";

// ❌ Bad - Will cause module resolution errors
import { SomeService } from "@calcom/features/...";
```
