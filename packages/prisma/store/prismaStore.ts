import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { AsyncLocalStorage } from "async_hooks";

import { bookingIdempotencyKeyExtension } from "../extensions/booking-idempotency-key";
import { disallowUndefinedDeleteUpdateManyExtension } from "../extensions/disallow-undefined-delete-update-many";
import { excludeLockedUsersExtension } from "../extensions/exclude-locked-users";
import { excludePendingPaymentsExtension } from "../extensions/exclude-pending-payment-teams";
import { usageTrackingExtention } from "../extensions/usage-tracking";
import { bookingReferenceMiddleware } from "../middleware";
import type { Tenant } from "./tenants";
import { getTenantFromHost, tenantToDatabaseUrl } from "./tenants";

export type PrismaClientWithExtensions = ReturnType<typeof getPrismaClient>;

type Store = { clients: Record<Tenant, PrismaClientWithExtensions>; currentTenant?: Tenant };

const als = new AsyncLocalStorage<Store>();

const getPrismaClient = (options?: Prisma.PrismaClientOptions) => {
  const _prisma = new PrismaClient(options);
  // If any changed on middleware server restart is required
  // TODO: Migrate it to $extends
  bookingReferenceMiddleware(_prisma);
  return _prisma
    .$extends(usageTrackingExtention())
    .$extends(excludeLockedUsersExtension())
    .$extends(excludePendingPaymentsExtension())
    .$extends(bookingIdempotencyKeyExtension())
    .$extends(disallowUndefinedDeleteUpdateManyExtension())
    .$extends(withAccelerate());
};

export function runWithTenants<T>(tenant?: Tenant | (() => Promise<T>), fn?: () => Promise<T>) {
  if (fn === undefined && typeof tenant === "function") {
    fn = tenant as () => Promise<T>;
    tenant = undefined;
  }
  return als.run({ clients: {}, currentTenant: tenant as Tenant | undefined } as Store, fn!);
}

export function getPrisma(tenant: Tenant, options?: Prisma.PrismaClientOptions) {
  const store = als.getStore();
  if (!store)
    throw new Error("Prisma Store not initialized. You must wrap your handler with runWithTenants.");

  if (!store.clients[tenant]) {
    const url = tenantToDatabaseUrl[tenant];

    if (!url) throw new Error(`Missing DB URL for tenant: ${tenant}`);

    store.clients[tenant] = getPrismaClient({
      ...options,
      datasources: { db: { url } },
    });
  }

  return store.clients[tenant];
}

export function getPrismaFromHost(host: string) {
  const tenant = getTenantFromHost(host);
  return getPrisma(tenant);
}

/**
 * Returns the Prisma client for the current tenant without needing to know the host or tenant.
 * Must be called within a context where the current tenant has been set (e.g. within a withPrismaRoute handler).
 * @returns The Prisma client for the current tenant
 */
export function getTenantAwarePrisma(options?: Prisma.PrismaClientOptions) {
  const store = als.getStore();
  if (!store)
    throw new Error("Prisma Store not initialized. You must wrap your handler with runWithTenants.");
  if (!store.currentTenant)
    throw new Error("Current tenant not set. You must specify a tenant when calling runWithTenants.");

  return getPrisma(store.currentTenant, options);
}

/**
 * Sets the current tenant for the active store.
 * @param tenant The tenant to set as current
 */
export function setCurrentTenant(tenant: Tenant) {
  const store = als.getStore();
  if (!store)
    throw new Error("Prisma Store not initialized. You must wrap your handler with runWithTenants.");
  store.currentTenant = tenant;
}

/**
 * Cleans up Prisma connections for a specific tenant or all tenants.
 * Use this to prevent connection leaks in long-running processes.
 * @param tenant Optional tenant to cleanup connections for. If not provided, all connections will be cleaned up.
 */
export async function cleanupPrismaConnections(tenant?: Tenant) {
  const store = als.getStore();
  if (!store) return;

  if (tenant && store.clients[tenant]) {
    await store.clients[tenant].$disconnect();
    delete store.clients[tenant];
  } else if (!tenant) {
    await Promise.all(Object.values(store.clients).map((client) => client.$disconnect()));
    store.clients = {} as Record<Tenant, PrismaClientWithExtensions>;
  }
}
