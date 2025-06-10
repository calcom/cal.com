// Prisma Store: Ensures a singleton Prisma client per tenant across all contexts to prevent connection leaks.
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

type Store = { clients: Record<Tenant, PrismaClientWithExtensions | undefined>; currentTenant?: Tenant };

function createEmptyClients(): Record<Tenant, PrismaClientWithExtensions | undefined> {
  return {
    [Tenant.US]: undefined,
    [Tenant.EU]: undefined,
    [Tenant.INSIGHTS]: undefined,
  };
}

// Singleton Store logic
let singletonStore: Store | undefined;
function getStore(): Store {
  if (process.env.NODE_ENV !== "production") {
    if (!(globalThis as any).__prismaStore) {
      (globalThis as any).__prismaStore = { clients: createEmptyClients() };
    }
    return (globalThis as any).__prismaStore;
  }
  if (!singletonStore) {
    singletonStore = { clients: createEmptyClients() };
  }
  return singletonStore;
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
    if (fn === undefined && typeof tenant === "function") {
      return (tenant as () => Promise<T>)();
    }
    return fn!();
  }
  if (fn === undefined && typeof tenant === "function") {
    fn = tenant as () => Promise<T>;
    tenant = undefined;
  }
  const store = getStore();
  const existingStore = als.getStore();
  if (existingStore && existingStore.currentTenant === tenant) {
    return fn!();
  }
  if (existingStore) {
    existingStore.currentTenant = tenant as Tenant | undefined;
    return fn!();
  }
  return als.run(store, fn!);
}

export function getPrisma(tenant: Tenant, options?: Prisma.PrismaClientOptions) {
  if (process.env.NODE_ENV === "test") {
    const url = getDatabaseUrl(tenant);
    const clientsMap = getClientsMap();
    if (!clientsMap[tenant]) {
      clientsMap[tenant] = getPrismaClient({
        ...options,
        ...(url ? { datasources: { db: { url } } } : {}),
      });
    }
    return clientsMap[tenant] as PrismaClientWithExtensions;
  }
  const store = getStore();
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
    return getPrisma(Tenant.US, options);
  }
  const store = getStore();
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
  const store = getStore();
  if (store) {
    if (tenant && store.clients[tenant]) {
      await store.clients[tenant]?.$disconnect();
      store.clients[tenant] = undefined;
    } else if (!tenant) {
      await Promise.all(Object.values(store.clients).map((client) => client?.$disconnect()));
      store.clients = createEmptyClients();
    }
  }
  if (process.env.NODE_ENV !== "production") {
    const clientsMap = getClientsMap();
    if (tenant && clientsMap[tenant]) {
      await clientsMap[tenant]?.$disconnect();
      clientsMap[tenant] = undefined;
    } else if (!tenant) {
      await Promise.all(Object.values(clientsMap).map((client) => client?.$disconnect()));
      (globalThis as any).__prismaClients = {};
    }
  }
}

// Utility to get the clients map, using globalThis in dev and test
function getClientsMap(): Partial<Record<Tenant, PrismaClientWithExtensions>> {
  if (process.env.NODE_ENV === "production") {
    return {};
  }
  if (!(globalThis as any).__prismaClients) {
    (globalThis as any).__prismaClients = {};
  }
  return (globalThis as any).__prismaClients;
}
