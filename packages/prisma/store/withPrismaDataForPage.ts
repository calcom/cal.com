import type { PrismaClient } from "@prisma/client";

import { runWithTenants, getPrisma } from "./prismaStore";
import { Tenant } from "./tenants";

export async function withPrismaDataForPage<T>(
  reqHeaders: Headers,
  loader: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  const tenantHeader = reqHeaders.get("x-tenant-id") as Tenant;
  if (!tenantHeader || !(Object.values(Tenant) as string[]).includes(tenantHeader)) {
    throw new Error("Missing or invalid x-tenant-id header");
  }

  return runWithTenants(tenantHeader, async () => {
    const prisma = getPrisma(tenantHeader);
    return loader(prisma);
  });
}
