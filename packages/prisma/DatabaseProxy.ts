import { AsyncLocalStorage } from "node:async_hooks";

import type { PrismaClient } from "./generated/prisma/client";

export type DatabaseProxy = PrismaClient & {
  replica: (name?: string | null) => PrismaClient;
  tenant: (name?: string | null) => DatabaseProxy;
};

export type TenantConfig = {
  primary: PrismaClient;
  replicas: Map<string, PrismaClient>;
};

export type ProxyConfig = TenantConfig & {
  tenants: Map<string, TenantConfig>;
};

export interface DbContext {
  replica?: string | null;
  tenant?: string | null;
}

const dbContext = new AsyncLocalStorage<DbContext>();

export function withDbContext<T>(ctx: DbContext, fn: () => T): T {
  return dbContext.run(ctx, fn);
}

export function createDatabaseProxy(config: ProxyConfig): DatabaseProxy {
  const { primary, replicas, tenants } = config;

  return new Proxy(primary, {
    get(_, prop) {
      if (prop === "replica") {
        return (name?: string | null) => {
          const resolvedName = name ?? dbContext.getStore()?.replica;
          return (resolvedName ? replicas.get(resolvedName) : undefined) ?? primary;
        };
      }

      if (prop === "tenant") {
        return (name?: string | null) => {
          const resolvedName = name ?? dbContext.getStore()?.tenant;
          const tenantCfg = resolvedName && tenants.get(resolvedName);
          return tenantCfg
            ? createDatabaseProxy({ ...tenantCfg, tenants })
            : createDatabaseProxy(config);
        };
      }

      return primary[prop as keyof PrismaClient];
    },
  }) as DatabaseProxy;
}
