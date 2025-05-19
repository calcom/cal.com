# Migrating to Tenant-Aware Prisma

This guide provides patterns for migrating different types of components to use tenant-aware Prisma clients.

## API Routes

### Before:
```typescript
import prisma from "@calcom/prisma";

export async function GET(req: Request) {
  const users = await prisma.user.findMany();
  return Response.json({ users });
}
```

### After:
```typescript
import { withPrismaRoute } from "@calcom/prisma/store/withPrismaRoute";

async function handler(req: Request, prisma: PrismaClient) {
  const users = await prisma.user.findMany();
  return Response.json({ users });
}

export const GET = withPrismaRoute(handler);
```

## Repository Classes

### Before:
```typescript
import prisma from "@calcom/prisma";

export class UserRepository {
  static async getUsers() {
    return await prisma.user.findMany();
  }
}
```

### After (Option 1 - Static instance with setter):
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

### After (Option 2 - Instance-based):
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

## Utility Functions

### Before:
```typescript
import prisma from "@calcom/prisma";

export async function getAppointments(userId: number) {
  return await prisma.booking.findMany({ where: { userId } });
}
```

### After:
```typescript
import type { PrismaClient } from "@prisma/client";
import { withPrismaClient } from "@calcom/prisma/store/withPrismaClient";

export async function getAppointments(userId: number, prisma: PrismaClient) {
  return await prisma.booking.findMany({ where: { userId } });
}

// Usage:
import { withPrismaClient } from "@calcom/prisma/store/withPrismaClient";
await withPrismaClient(headers, async (prisma) => {
  return getAppointments(userId, prisma);
});
```

## Server-Side Props

### Before:
```typescript
import { GetServerSideProps } from "next";
import prisma from "@calcom/prisma";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const users = await prisma.user.findMany();
  return { props: { users } };
};
```

### After:
```typescript
import { GetServerSideProps } from "next";
import { withPrismaSsr } from "@calcom/prisma/store/withPrismaSsr";

const handler = async (ctx, prisma) => {
  const users = await prisma.user.findMany();
  return { props: { users } };
};

export const getServerSideProps: GetServerSideProps = withPrismaSsr(handler);
```

## Cron Jobs

### Before:
```typescript
import prisma from "@calcom/prisma";

export async function processCron() {
  const users = await prisma.user.findMany();
  // Process users
}
```

### After:
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
