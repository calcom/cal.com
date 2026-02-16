import process from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createDatabaseProxy, type DatabaseProxy, type TenantConfig } from "./DatabaseProxy";
import { bookingIdempotencyKeyExtension } from "./extensions/booking-idempotency-key";
import { disallowUndefinedDeleteUpdateManyExtension } from "./extensions/disallow-undefined-delete-update-many";
import { excludeLockedUsersExtension } from "./extensions/exclude-locked-users";
import { excludePendingPaymentsExtension } from "./extensions/exclude-pending-payment-teams";
import { type Prisma, PrismaClient } from "./generated/prisma/client";

const connectionString = process.env.DATABASE_URL || "";
const pool =
  process.env.USE_POOL === "true" || process.env.USE_POOL === "1"
    ? new Pool({
        connectionString: connectionString,
        max: 5,
        idleTimeoutMillis: 300000,
      })
    : undefined;

const adapter = pool ? new PrismaPg(pool) : new PrismaPg({ connectionString });
const prismaOptions: Prisma.PrismaClientOptions = {
  adapter,
};

const globalForPrisma = global as unknown as {
  baseClient: PrismaClient;
};
const loggerLevel = parseInt(process.env.NEXT_PUBLIC_LOGGER_LEVEL ?? "", 10);

if (!isNaN(loggerLevel)) {
  switch (loggerLevel) {
    case 5:
    case 6:
      prismaOptions.log = ["error"];
      break;
    case 4:
      prismaOptions.log = ["warn", "error"];
      break;
    case 3:
      prismaOptions.log = ["info", "error", "warn"];
      break;
    default:
      // For values 0, 1, 2 (or anything else below 3)
      prismaOptions.log = ["query", "info", "error", "warn"];
      break;
  }
}
const baseClient = globalForPrisma.baseClient || new PrismaClient(prismaOptions);

export const customPrisma = (options?: Prisma.PrismaClientOptions) => {
  let finalOptions = { ...prismaOptions };

  if (options?.datasources?.db?.url) {
    const customConnectionString = options.datasources.db.url;
    const customAdapter = new PrismaPg({ connectionString: customConnectionString });

    const { datasources: _datasources, ...restOptions } = options;
    finalOptions = {
      ...prismaOptions,
      ...restOptions,
      adapter: customAdapter,
    };
  } else if (options) {
    finalOptions = { ...prismaOptions, ...options };
  }

  return new PrismaClient(finalOptions)
    .$extends(excludeLockedUsersExtension())
    .$extends(excludePendingPaymentsExtension())
    .$extends(bookingIdempotencyKeyExtension())
    .$extends(disallowUndefinedDeleteUpdateManyExtension()) as unknown as PrismaClient;
};

// FIXME: Due to some reason, there are types failing in certain places due to the $extends. Fix it and then enable it
// Specifically we get errors like `Type 'string | Date | null | undefined' is not assignable to type 'Exact<string | Date | null | undefined, string | Date | null | undefined>'`

// Explanation why we cast as PrismaClient. When we leave Prisma to its devices it tries to infer logic based on the extensions, but this is not a simple extends.
// this makes the PrismaClient export type-hint impossible and it also is a massive hit on Prisma type hinting performance.
const basePrisma: PrismaClient = baseClient
  .$extends(excludeLockedUsersExtension())
  .$extends(excludePendingPaymentsExtension())
  .$extends(bookingIdempotencyKeyExtension())
  .$extends(disallowUndefinedDeleteUpdateManyExtension()) as unknown as PrismaClient;

// This prisma instance is meant to be used only for READ operations.
// If self hosting, feel free to leave INSIGHTS_DATABASE_URL as empty and `readonlyPrisma` will default to `basePrisma`.
export const readonlyPrisma = process.env.INSIGHTS_DATABASE_URL
  ? customPrisma({
      datasources: { db: { url: process.env.INSIGHTS_DATABASE_URL } },
    })
  : basePrisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.baseClient = baseClient;
}

type OmitPrismaClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

// we cant pass tx to functions as types miss match since we have a custom prisma client https://github.com/prisma/prisma/discussions/20924#discussioncomment-10077649
export type {
  OmitPrismaClient as PrismaTransaction,
  // we re-export the native PrismaClient type for backwards-compatibility.
  PrismaClient,
};

function parseReplicaConfig(): Record<string, string> {
  const config = process.env.DATABASE_READ_REPLICAS;
  if (!config) return {};
  try {
    return JSON.parse(config);
  } catch {
    return {};
  }
}

type TenantEnvConfig =
  | string
  | {
      primary: string;
      replicas?: Record<string, string>;
    };

function parseTenantsConfig(): Record<string, TenantEnvConfig> {
  const config = process.env.DATABASE_TENANTS;
  if (!config) return {};
  try {
    return JSON.parse(config);
  } catch {
    return {};
  }
}

const replicaConfig = parseReplicaConfig();
const replicas = new Map<string, PrismaClient>(
  Object.entries(replicaConfig).map(([name, url]) => [name, customPrisma({ datasources: { db: { url } } })])
);

const tenantsEnvConfig = parseTenantsConfig();
const tenants = new Map<string, TenantConfig>();

for (const [tenantName, tenantEnvConfig] of Object.entries(tenantsEnvConfig)) {
  const isSimpleConfig = typeof tenantEnvConfig === "string";
  const primaryUrl = isSimpleConfig ? tenantEnvConfig : tenantEnvConfig.primary;
  const tenantPrimary = customPrisma({ datasources: { db: { url: primaryUrl } } });

  const tenantReplicasConfig = isSimpleConfig ? {} : (tenantEnvConfig.replicas ?? {});
  const tenantReplicas = new Map<string, PrismaClient>(
    Object.entries(tenantReplicasConfig).map(([name, url]) => [
      name,
      customPrisma({ datasources: { db: { url } } }),
    ])
  );

  tenants.set(tenantName, {
    primary: tenantPrimary,
    replicas: tenantReplicas,
  });
}

export const prisma: DatabaseProxy = createDatabaseProxy({
  primary: basePrisma,
  replicas,
  tenants,
});

export type { DatabaseProxy };

export default prisma;
export * from "./selects";

