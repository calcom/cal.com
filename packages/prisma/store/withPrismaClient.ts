import type { PrismaClientWithExtensions } from "./prismaStore";
import { runWithTenants, getPrismaFromHost, getPrisma } from "./prismaStore";
import { Tenant } from "./tenants";

export type PrismaCallback<T> = (prisma: PrismaClientWithExtensions) => Promise<T>;

export function withPrismaClient<T>(
  headers: Headers | Record<string, string>,
  callback: PrismaCallback<T>
): Promise<T> {
  const host =
    typeof headers.get === "function"
      ? headers.get("host") || ""
      : (headers as Record<string, string>)["host"] || "";
  return withPrismaHost<T>(host, callback);
}

export function withPrismaHost<T>(host: string, callback: PrismaCallback<T>): Promise<T> {
  return runWithTenants(async () => {
    const prisma = getPrismaFromHost(host);
    return callback(prisma);
  });
}

export function withMultiTenantPrisma<T>(
  callback: (tenantPrisma: Record<string, PrismaClientWithExtensions>) => Promise<T>
): Promise<T> {
  return runWithTenants(async () => {
    const tenantClients: Record<string, PrismaClientWithExtensions> = {};

    for (const tenant of Object.values(Tenant)) {
      tenantClients[tenant] = getPrisma(tenant as Tenant);
    }

    return callback(tenantClients);
  });
}
