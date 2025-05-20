# Prisma Tenant-Aware Migration Tracking

This document tracks the migration of all files that need to be converted to use tenant-aware Prisma clients. **All files must be migrated before merging the PR.**

## Migration Summary

| Category | Total Files | Migrated | Remaining | Status |
|----------|-------------|----------|-----------|--------|
| API Routes (App Router) | 58 | 29 | 29 | 🟡 In Progress |
| API Routes (Pages Router) | 146 | 92 | 54 | 🟡 In Progress |
| NestJS API (v2) | 32 | 0 | 32 | 🔴 Not Started |
| tRPC Procedures | 248 | 248 | 0 | 🟢 Completed |
| Repository Classes | 35 | 0 | 35 | 🔴 Not Started |
| Utility Functions | 168 | 0 | 168 | 🔴 Not Started |
| Test Files | 112 | 0 | 112 | 🔴 Not Started |
| Cron Jobs | 35 | 0 | 35 | 🔴 Not Started |
| **Total** | **834** | **369** | **465** | 🟡 In Progress |

## Migration Patterns

### 1. API Routes (App Router)

**Migration Pattern**: Use `withPrismaRoute` HOC

**Before:**
```typescript
import prisma from "@calcom/prisma";

export async function GET(req: Request) {
  const users = await prisma.user.findMany();
  return Response.json({ users });
}
```

**After:**
```typescript
import { withPrismaRoute } from "@calcom/prisma/store/withPrismaRoute";
import type { PrismaClient } from "@prisma/client";

async function handler(req: Request, prisma: PrismaClient) {
  const users = await prisma.user.findMany();
  return Response.json({ users });
}

export const GET = withPrismaRoute(handler);
```

### 2. API Routes (Pages Router)

**Migration Pattern**: Use `withPrismaApiHandler` HOC

**Before:**
```typescript
import prisma from "@calcom/prisma";

export default async function handler(req, res) {
  const users = await prisma.user.findMany();
  res.status(200).json({ users });
}
```

**After:**
```typescript
import { withPrismaApiHandler } from "@calcom/prisma/store/withPrismaApiHandler";
import type { PrismaClient } from "@prisma/client";

async function handler(req, res, prisma: PrismaClient) {
  const users = await prisma.user.findMany();
  res.status(200).json({ users });
}

export default withPrismaApiHandler(handler);
```

### 3. NestJS API (v2)

**Migration Pattern**: Use `TenantAwarePrismaService`

**Before:**
```typescript
import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@calcom/prisma";

@Injectable()
export class MyService {
  private prisma = new PrismaClient();

  async findUsers() {
    return await this.prisma.user.findMany();
  }
}
```

**After:**
```typescript
import { Injectable } from "@nestjs/common";
import { TenantAwarePrismaService } from "../modules/prisma/tenant-aware-prisma.service";

@Injectable()
export class MyService {
  constructor(private readonly prismaService: TenantAwarePrismaService) {}

  async findUsers() {
    return await this.prismaService.prisma.user.findMany();
  }
}
```

### 4. tRPC Procedures

**Migration Pattern**: Already handled with middleware, use `ctx.prisma`

**Before:**
```typescript
import prisma from "@calcom/prisma";

export const myProcedure = publicProcedure.query(async () => {
  const users = await prisma.user.findMany();
  return users;
});
```

**After:**
```typescript
export const myProcedure = publicProcedure.query(async ({ ctx }) => {
  const users = await ctx.prisma.user.findMany();
  return users;
});
```

### 5. Repository Classes

**Migration Pattern**: Use `createTenantRepository` or modify to accept prisma client

**Before:**
```typescript
import prisma from "@calcom/prisma";

export class UserRepository {
  static async getUsers() {
    return await prisma.user.findMany();
  }
}
```

**After (Option 1 - Static instance with setter):**
```typescript
import type { PrismaClient } from "@prisma/client";

export class UserRepository {
  private static _prisma: PrismaClient;
  
  static setPrismaClient(prisma: PrismaClient) {
    this._prisma = prisma;
  }
  
  static get prisma() {
    return this._prisma || (globalThis as any).prisma;
  }
  
  static async getUsers() {
    return await this.prisma.user.findMany();
  }
}
```

**After (Option 2 - Instance-based):**
```typescript
import type { PrismaClient } from "@prisma/client";

export class UserRepository {
  constructor(private prisma: PrismaClient) {}
  
  async getUsers() {
    return await this.prisma.user.findMany();
  }
}

// Usage:
import { createTenantRepository } from "@calcom/lib/server/repository/repositoryFactory";
const userRepo = createTenantRepository(UserRepository, host);
```

### 6. Utility Functions

**Migration Pattern**: Accept prisma client as parameter or use `withPrismaClient`

**Before:**
```typescript
import prisma from "@calcom/prisma";

export async function getAppointments(userId: number) {
  return await prisma.booking.findMany({ where: { userId } });
}
```

**After:**
```typescript
import type { PrismaClient } from "@prisma/client";

export async function getAppointments(userId: number, prisma: PrismaClient) {
  return await prisma.booking.findMany({ where: { userId } });
}

// Usage:
import { withPrismaClient } from "@calcom/prisma/store/withPrismaClient";
await withPrismaClient(headers, async (prisma) => {
  return getAppointments(userId, prisma);
});
```

### 7. Test Files

**Migration Pattern**: Lower priority, can use direct prisma import for now or use test-specific prisma client

### 8. Cron Jobs

**Migration Pattern**: Use `withMultiTenantPrisma`

**Before:**
```typescript
import prisma from "@calcom/prisma";

export async function processCron() {
  const users = await prisma.user.findMany();
  // Process users
}
```

**After:**
```typescript
import { withMultiTenantPrisma } from "@calcom/prisma/store/withPrismaClient";

export async function processCron() {
  return withMultiTenantPrisma(async (clients) => {
    // Process for each tenant
    for (const [tenant, prisma] of Object.entries(clients)) {
      const users = await prisma.user.findMany();
      // Process users for this tenant
    }
  });
}
```

## Migration Strategy

1. Start with high-impact areas first:
   - API Routes that serve user-facing requests
   - Repository classes that are widely used
   - Utility functions that are called frequently

2. Test each migration individually to ensure it works correctly

3. For large-scale changes, use automated tools when possible:
   - Use find and replace for simple patterns
   - Use codemod scripts for more complex transformations

4. Update the tracking document after each migration to keep progress visible
