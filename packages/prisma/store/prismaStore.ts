import { PrismaClient } from "@prisma/client";
import { AsyncLocalStorage } from "async_hooks";

import type { Tenants } from "./tenants";
import { tenantToDatabaseUrl } from "./tenants";

type Store = { clients: Record<Tenants, PrismaClient> };

const als = new AsyncLocalStorage<Store>();

export function runWithTenants<T>(fn: () => Promise<T>) {
  return als.run({ clients: {} } as Store, fn);
}

export function getPrisma(tenant: Tenants) {
  const store = als.getStore();
  if (!store)
    throw new Error("Prisma Store not initialized. You must wrap your handler with runWithTenants.");

  if (!store.clients[tenant]) {
    const url = tenantToDatabaseUrl[tenant];

    if (!url) throw new Error(`Missing DB URL for tenant: ${tenant}`);

    store.clients[tenant] = new PrismaClient({
      datasources: { db: { url } },
    });
  }

  return store.clients[tenant];
}
