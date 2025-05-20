# Prisma Store

This package provides tenant-aware Prisma clients for multi-tenant database connections in Cal.com.

## Overview

The system uses AsyncLocalStorage to store and retrieve tenant-specific Prisma clients. This approach ensures that each request uses the correct database connection without needing to pass the client explicitly through every function call.

## Core Components

- `prismaStore.ts`: Implements the AsyncLocalStorage pattern for Prisma clients
- `tenants.ts`: Defines available tenants (US, EU) and host-based tenant selection logic
- `withPrismaRoute.ts`: HOC for App Router API routes
- `withPrismaApiHandler.ts`: HOC for Pages Router API routes
- `withPrismaSsr.ts`: HOC for SSR pages
- `withPrismaDataForPage.ts`: Helper for data loading with tenant-aware Prisma
- `withPrismaClient.ts`: Utility functions for working with tenant-aware Prisma clients

## Usage

### Direct API Usage with getTenantAwarePrisma

The simplest way to use the tenant-aware Prisma client is with the `getTenantAwarePrisma()` function:

```typescript
import { getTenantAwarePrisma } from "@calcom/prisma/store/prismaStore";

async function myFunction() {
  // Get the Prisma client for the current tenant
  const prisma = getTenantAwarePrisma();
  
  // Use the Prisma client as usual
  const users = await prisma.user.findMany();
  return users;
}
```

This function must be called within a context where the current tenant has been set, such as within a handler wrapped with `withPrismaRoute`, `withPrismaApiHandler`, or `withPrismaSsr`.

### API Routes (App Router)

```typescript
import { withPrismaRoute } from "@calcom/prisma/store/withPrismaRoute";
import { getTenantAwarePrisma } from "@calcom/prisma/store/prismaStore";

async function handler(req: Request, prisma: PrismaClient) {
  // Option 1: Use the injected prisma client
  // const users = await prisma.user.findMany();
  
  // Option 2: Use getTenantAwarePrisma() anywhere in your code
  const prisma = getTenantAwarePrisma();
  
  const users = await prisma.user.findMany();
  return Response.json({ users });
}

export const GET = withPrismaRoute(handler);
```

### API Routes (Pages Router)

```typescript
import { withPrismaApiHandler } from "@calcom/prisma/store/withPrismaApiHandler";
import { getTenantAwarePrisma } from "@calcom/prisma/store/prismaStore";

async function handler(req, res, prisma) {
  // Option 1: Use the injected prisma client from parameters
  // const users = await prisma.user.findMany();
  
  // Option 2: Use getTenantAwarePrisma() anywhere in your code
  const prisma = getTenantAwarePrisma();
  
  const users = await prisma.user.findMany();
  res.status(200).json({ users });
}

export default withPrismaApiHandler(handler);
```

### Server-Side Rendering

```typescript
import { withPrismaSsr } from "@calcom/prisma/store/withPrismaSsr";
import { getTenantAwarePrisma } from "@calcom/prisma/store/prismaStore";

const handler = async (ctx, prisma) => {
  // Option 1: Use the injected prisma client from parameters
  // const users = await prisma.user.findMany();
  
  // Option 2: Use getTenantAwarePrisma() anywhere in your code
  const prisma = getTenantAwarePrisma();
  
  const users = await prisma.user.findMany();
  return { props: { users } };
};

export const getServerSideProps = withPrismaSsr(handler);
```

### Using with tRPC

For tRPC procedures, a middleware automatically selects the correct tenant based on the request host and provides it in the context.

```typescript
// ✅ Do this
const myProcedure = publicProcedure.query(async ({ ctx }) => {
  const users = await ctx.prisma.user.findMany();
  return users;
});

// ❌ Don't do this
// import prisma from "@calcom/prisma";
// const myProcedure = publicProcedure.query(async () => {
//   const users = await prisma.user.findMany();
//   return users;
// });
```

### Repository Pattern

```typescript
import { createTenantRepository } from "@calcom/lib/server/repository/repositoryFactory";

// Define your repository class
class UserRepository {
  constructor(private prisma: PrismaClient) {}
  
  async getUsers() {
    return await this.prisma.user.findMany();
  }
}

// Create a tenant-aware instance
const userRepo = createTenantRepository(UserRepository, host);
const users = await userRepo.getUsers();
```

### Preventing Connection Leaks

For long-running processes, you can clean up Prisma connections to prevent leaks:

```typescript
import { cleanupPrismaConnections } from "@calcom/prisma/store/prismaStore";

// Clean up connections for a specific tenant
await cleanupPrismaConnections(Tenant.US);

// Or clean up all connections
await cleanupPrismaConnections();
```

## Migration

See [MIGRATION.md](./MIGRATION.md) for detailed instructions on migrating from global Prisma client to tenant-aware Prisma clients.

See [PRISMA_MIGRATION_TRACKING.md](./PRISMA_MIGRATION_TRACKING.md) for a comprehensive list of all files that need to be migrated.
