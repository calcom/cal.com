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
import { Tenant, getDatabaseUrl, getTenantFromHost } from "./tenants";

export type PrismaClientWithExtensions = ReturnType<typeof getPrismaClient>;

type Store = { clients: Record<Tenant, PrismaClientWithExtensions>; currentTenant?: Tenant };

// DRY & KISS: Utility to get the clients map, using globalThis in dev and test
type ClientsMap = Partial<Record<Tenant, PrismaClientWithExtensions>>;
function getClientsMap(): ClientsMap {
  if (process.env.NODE_ENV === "production") {
    return {};
  }
  if (!(globalThis as any).__prismaClients) {
    (globalThis as any).__prismaClients = {};
  }
  return (globalThis as any).__prismaClients;
}

const als = new AsyncLocalStorage<Store>();

export const getPrismaClient = (options?: Prisma.PrismaClientOptions) => {
  const _prisma = new PrismaClient(options);
  // If any changed on middleware server restart is required
  // TODO: Migrate it to $extends
  bookingReferenceMiddleware(_prisma);
  return _prisma
    .$extends(usageTrackingExtention(_prisma))
    .$extends(excludeLockedUsersExtension())
    .$extends(excludePendingPaymentsExtension())
    .$extends(bookingIdempotencyKeyExtension())
    .$extends(disallowUndefinedDeleteUpdateManyExtension())
    .$extends(withAccelerate());
};

export function runWithTenants<T>(tenant?: Tenant | (() => Promise<T>), fn?: () => Promise<T>) {
  if (process.env.NODE_ENV === "test") {
    // In test environment, we'll execute the function directly
    // but still ensure we're using a shared connection
    if (fn === undefined && typeof tenant === "function") {
      return (tenant as () => Promise<T>)();
    }
    return fn!();
  }

  if (fn === undefined && typeof tenant === "function") {
    fn = tenant as () => Promise<T>;
    tenant = undefined;
  }
  const existingStore = als.getStore();
  if (existingStore && existingStore.currentTenant === tenant) {
    // Already in the right context, just run the function
    return fn!();
  }
  if (existingStore) {
    // Update currentTenant in the existing context
    existingStore.currentTenant = tenant as Tenant | undefined;
    return fn!();
  }
  // Otherwise, create a new context
  return als.run({ clients: getClientsMap(), currentTenant: tenant as Tenant | undefined } as Store, fn!);
}

export function getPrisma(tenant: Tenant, options?: Prisma.PrismaClientOptions) {
  if (process.env.NODE_ENV === "test") {
    const url = getDatabaseUrl(tenant);
    const clientsMap = getClientsMap();

    // Reuse existing client for this tenant in test environment
    if (!clientsMap[tenant]) {
      clientsMap[tenant] = getPrismaClient({
        ...options,
        ...(url ? { datasources: { db: { url } } } : {}),
      });
    }

    return clientsMap[tenant] as PrismaClientWithExtensions;
  }

  const store = als.getStore();
  if (!store)
    throw new Error("Prisma Store not initialized. You must wrap your handler with runWithTenants.");

  if (!store.clients[tenant]) {
    const url = getDatabaseUrl(tenant);

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
  if (process.env.NODE_ENV === "test") {
    // In test environment, we'll reuse the US tenant connection
    return getPrisma(Tenant.US, options);
  }

  const store = als.getStore();
  if (!store)
    throw new Error("Prisma Store not initialized. You must wrap your handler with runWithTenants.");
  if (!store.currentTenant)
    throw new Error("Current tenant not set. You must specify a tenant when calling runWithTenants.");

  return getPrisma(store.currentTenant, options);
}

/**
 * Cleans up Prisma connections for a specific tenant or all tenants.
 * Use this to prevent connection leaks in long-running processes.
 * @param tenant Optional tenant to cleanup connections for. If not provided, all connections will be cleaned up.
 */
export async function cleanupPrismaConnections(tenant?: Tenant) {
  // Clean up store connections
  const store = als.getStore();
  if (store) {
    if (tenant && store.clients[tenant]) {
      await store.clients[tenant].$disconnect();
      delete store.clients[tenant];
    } else if (!tenant) {
      await Promise.all(Object.values(store.clients).map((client) => client.$disconnect()));
      store.clients = {} as Record<Tenant, PrismaClientWithExtensions>;
    }
  }

  // Clean up global clients map in test environment
  if (process.env.NODE_ENV !== "production") {
    const clientsMap = getClientsMap();
    if (tenant && clientsMap[tenant]) {
      await clientsMap[tenant]?.$disconnect();
      delete clientsMap[tenant];
    } else if (!tenant) {
      await Promise.all(Object.values(clientsMap).map((client) => client?.$disconnect()));
      (globalThis as any).__prismaClients = {};
    }
  }
}
