import type { Prisma } from "@prisma/client";

import type { PrismaClientWithExtensions } from "./store/prismaStore";
import { getPrisma, getTenantAwarePrisma } from "./store/prismaStore";
import { SystemTenant } from "./store/tenants";

const prismaOptions: Prisma.PrismaClientOptions = {};

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

export const prisma =
  process.env.NODE_ENV === "test"
    ? getPrisma(SystemTenant.DEFAULT, prismaOptions)
    : new Proxy({} as PrismaClientWithExtensions, {
        get(_target, prop) {
          try {
            const tenantPrisma = getTenantAwarePrisma(prismaOptions);
            return typeof Reflect.get(tenantPrisma, prop) === "function" ? (Reflect.get(tenantPrisma, prop) as any).bind(tenantPrisma) : Reflect.get(tenantPrisma, prop);
          } catch (error) {
            console.error(error);
            throw new Error(
              "Prisma was called outside of runWithTenants. Please wrap your code with runWithTenants or use a tenant-aware approach."
            );
          }
        },
      });

const insightsPrismaProxy = new Proxy({} as PrismaClientWithExtensions, {
  get(_target, prop) {
    return Reflect.get(getPrisma(SystemTenant.INSIGHTS, prismaOptions), prop);
  },
});

// This prisma instance is meant to be used only for READ operations.
// If self hosting, feel free to leave INSIGHTS_DATABASE_URL as empty and `readonlyPrisma` will default to `prisma`.
export const readonlyPrisma = process.env.INSIGHTS_DATABASE_URL ? insightsPrismaProxy : prisma;

export type PrismaClient = PrismaClientWithExtensions;

type OmitPrismaClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

// we cant pass tx to functions as types miss match since we have a custom prisma client https://github.com/prisma/prisma/discussions/20924#discussioncomment-10077649
export type PrismaTransaction = OmitPrismaClient;

export default prisma;

export * from "./selects";
