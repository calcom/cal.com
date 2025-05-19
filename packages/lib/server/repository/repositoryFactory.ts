import type { PrismaClient } from "@prisma/client";

import { getPrismaFromHost, runWithTenants } from "@calcom/prisma/store/prismaStore";

export function createTenantRepository<T>(RepositoryClass: new (prisma: PrismaClient) => T, host: string): T {
  return runWithTenants(() => {
    const prisma = getPrismaFromHost(host);
    return new RepositoryClass(prisma);
  });
}

export function createRepository<T>(
  RepositoryClass: new (prisma: PrismaClient) => T,
  prisma: PrismaClient
): T {
  return new RepositoryClass(prisma);
}
