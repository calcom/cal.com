# Multi-tenant Prisma Store

This directory contains the implementation for Cal.com's multi-tenant database connections system. It allows the application to dynamically select the appropriate database client based on the request's host.

## Overview

The system uses AsyncLocalStorage to store and retrieve tenant-specific Prisma clients. This approach ensures that each request uses the correct database connection without needing to pass the client explicitly through every function call.

## Core Components

- `prismaStore.ts`: Implements the AsyncLocalStorage pattern for Prisma clients
- `tenants.ts`: Defines available tenants (US, EU) and host-based tenant selection logic
- `withPrismaRoute.ts`: HOC for API routes that need tenant-aware Prisma access
- `withPrismaSsr.ts`: HOC for SSR pages that need tenant-aware Prisma access
- `withPrismaDataForPage.ts`: Helper for data loading with tenant-aware Prisma

## Using with tRPC

For tRPC procedures, a middleware automatically selects the correct tenant based on the request host and provides it in the context.

### DO NOT

```ts
// ❌ Don't do this in tRPC procedures
import prisma from "@calcom/prisma";

const myProcedure = publicProcedure.query(async () => {
  const users = await prisma.user.findMany();
  return users;
});
```

### DO

```ts
// ✅ Do this instead
const myProcedure = publicProcedure.query(async ({ ctx }) => {
  const users = await ctx.prisma.user.findMany();
  return users;
});
```

This ensures that all database operations use the correct tenant-specific connection based on the request's host.
