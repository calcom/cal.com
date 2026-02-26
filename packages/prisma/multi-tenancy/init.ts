import { AsyncLocalStorage } from "node:async_hooks";
import http from "node:http";
import type { PrismaClient } from "../generated/prisma/client";
import { tenantContext } from "./context";

type Tenant = string;

export const tenantStorage = new AsyncLocalStorage<{ tenant: Tenant }>();

const clients = new Map<Tenant, PrismaClient>();

let tenantConfig: Record<string, string> | null = null;
type TenantClientFactory = (url: string) => PrismaClient;
let tenantClientFactory: TenantClientFactory | null = null;

export function setTenantClientFactory(factory: TenantClientFactory): void {
  tenantClientFactory = factory;
}

function getTenantConfig(): Record<string, string> {
  if (tenantConfig) return tenantConfig;

  const raw = process.env.DATABASE_TENANTS;
  if (!raw) {
    tenantConfig = {};
    return tenantConfig;
  }

  try {
    tenantConfig = JSON.parse(raw) as Record<string, string>;
  } catch {
    console.error("[MultiTenancy] DATABASE_TENANTS is not valid JSON, ignoring");
    tenantConfig = {};
  }
  return tenantConfig;
}

function getTenantClient(tenant: Tenant): PrismaClient | null {
  const url = getTenantConfig()[tenant];
  if (!url) return null;
  if (!tenantClientFactory) return null;

  const existing = clients.get(tenant);
  if (existing) return existing;

  const client = tenantClientFactory(url);
  clients.set(tenant, client);
  return client;
}

function resolveClient(defaultClient: PrismaClient): PrismaClient {
  const tenant = tenantStorage.getStore()?.tenant;
  if (!tenant) return defaultClient;
  return getTenantClient(tenant) ?? defaultClient;
}

export function getTenant(): Tenant | undefined {
  return tenantStorage.getStore()?.tenant;
}

export function initMultiTenancy(): void {
  tenantContext.setResolver(resolveClient);

  type EmitFn = (event: string, ...args: unknown[]) => boolean;
  const originalEmit: EmitFn = http.Server.prototype.emit;
  (http.Server.prototype as { emit: EmitFn }).emit = function (event: string, ...args: unknown[]) {
    if (event === "request") {
      const req = args[0] as http.IncomingMessage;
      const tenant = req.headers["x-db-tenant"] as string | undefined;
      if (tenant) {
        return tenantStorage.run({ tenant }, () => originalEmit.apply(this, [event, ...args]));
      }
    }
    return originalEmit.apply(this, [event, ...args]);
  };
}
