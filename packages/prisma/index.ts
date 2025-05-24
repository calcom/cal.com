import type { Prisma } from "@prisma/client";

import type { PrismaClientWithExtensions } from "./store/prismaStore";
import { getPrisma, getTenantAwarePrisma } from "./store/prismaStore";
import { Tenant } from "./store/tenants";

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

// If any changed on middleware server restart is required
// TODO: Migrate it to $extends

export const prisma = new Proxy({} as PrismaClientWithExtensions, {
  get(target, prop) {
    if (process.env.NODE_ENV === "test") {
      const defaultPrisma = getPrisma(Tenant.US, prismaOptions);
      return Reflect.get(defaultPrisma, prop);
    }

    try {
      const tenantPrisma = getTenantAwarePrisma(prismaOptions);
      return Reflect.get(tenantPrisma, prop);
    } catch (error) {
      throw new Error(
        "Prisma was called outside of runWithTenants. Please wrap your code with runWithTenants or use a tenant-aware approach."
      );
    }
  },
});

// This prisma instance is meant to be used only for READ operations.
// If self hosting, feel free to leave INSIGHTS_DATABASE_URL as empty and `readonlyPrisma` will default to `prisma`.
export const readonlyPrisma = process.env.INSIGHTS_DATABASE_URL
  ? getPrisma(Tenant.INSIGHTS, prismaOptions)
  : prisma;

export type PrismaClient = PrismaClientWithExtensions;

type OmitPrismaClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

// we cant pass tx to functions as types miss match since we have a custom prisma client https://github.com/prisma/prisma/discussions/20924#discussioncomment-10077649
export type PrismaTransaction = OmitPrismaClient;

export default prisma;

export * from "./selects";
