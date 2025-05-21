import type { Prisma } from "@prisma/client";
import { PrismaClient as PrismaClientWithoutExtension } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

import { bookingIdempotencyKeyExtension } from "./extensions/booking-idempotency-key";
import { disallowUndefinedDeleteUpdateManyExtension } from "./extensions/disallow-undefined-delete-update-many";
import { excludeLockedUsersExtension } from "./extensions/exclude-locked-users";
import { excludePendingPaymentsExtension } from "./extensions/exclude-pending-payment-teams";
import { usageTrackingExtention } from "./extensions/usage-tracking";
import { bookingReferenceMiddleware } from "./middleware";
import { getTenantAwarePrisma } from "./store/prismaStore";

const prismaOptions: Prisma.PrismaClientOptions = {};

const globalForPrisma = global as unknown as {
  prismaWithoutClientExtensions: PrismaClientWithoutExtension;
  prismaWithClientExtensions: PrismaClientWithExtensions;
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

// Prevents flooding with idle connections
const prismaWithoutClientExtensions =
  globalForPrisma.prismaWithoutClientExtensions || new PrismaClientWithoutExtension(prismaOptions);

export const customPrisma = (options?: Prisma.PrismaClientOptions) =>
  new PrismaClientWithoutExtension({ ...prismaOptions, ...options })
    .$extends(usageTrackingExtention())
    .$extends(excludeLockedUsersExtension())
    .$extends(excludePendingPaymentsExtension())
    .$extends(bookingIdempotencyKeyExtension())
    .$extends(disallowUndefinedDeleteUpdateManyExtension())
    .$extends(withAccelerate());

// If any changed on middleware server restart is required
// TODO: Migrate it to $extends
bookingReferenceMiddleware(prismaWithoutClientExtensions);

// FIXME: Due to some reason, there are types failing in certain places due to the $extends. Fix it and then enable it
// Specifically we get errors like `Type 'string | Date | null | undefined' is not assignable to type 'Exact<string | Date | null | undefined, string | Date | null | undefined>'`
const prismaWithClientExtensions = prismaWithoutClientExtensions
  .$extends(usageTrackingExtention())
  .$extends(excludeLockedUsersExtension())
  .$extends(excludePendingPaymentsExtension())
  .$extends(bookingIdempotencyKeyExtension())
  .$extends(disallowUndefinedDeleteUpdateManyExtension())
  .$extends(withAccelerate());

export const prisma = new Proxy({} as PrismaClientWithExtensions, {
  get(target, prop) {
    try {
      const tenantPrisma = getTenantAwarePrisma();
      return Reflect.get(tenantPrisma, prop);
    } catch (error) {
      throw new Error(
        "Prisma was called outside of runWithTenants. Please wrap your code with runWithTenants or use a tenant-aware approach."
      );
    }
  },
});

/**
 * IMPORTANT: This global Prisma client is being deprecated.
 * All database calls should be tenant-aware using one of the following approaches:
 * 1. In tRPC procedures: Use ctx.prisma from the context
 * 2. In API routes: Use withPrismaRoute HOC from @calcom/prisma/store/withPrismaRoute
 * 3. In SSR functions: Use withPrismaSsr HOC from @calcom/prisma/store/withPrismaSsr
 * 4. In utility functions: Accept prisma client as a parameter or use withPrismaClient from @calcom/prisma/store/withPrismaClient
 * 5. In repository classes: Use setPrismaClient or accept it in the constructor
 * @see packages/prisma/store/MIGRATION.md for migration examples
 * @deprecated Use tenant-aware Prisma clients instead
 */

// This prisma instance is meant to be used only for READ operations.
// If self hosting, feel free to leave INSIGHTS_DATABASE_URL as empty and `readonlyPrisma` will default to `prisma`.
export const readonlyPrisma = process.env.INSIGHTS_DATABASE_URL
  ? customPrisma({
      datasources: { db: { url: process.env.INSIGHTS_DATABASE_URL } },
    })
  : prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaWithoutClientExtensions = prismaWithoutClientExtensions;
  globalForPrisma.prismaWithClientExtensions = prisma;
}

type PrismaClientWithExtensions = typeof prismaWithClientExtensions;
export type PrismaClient = PrismaClientWithExtensions;

type OmitPrismaClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

// we cant pass tx to functions as types miss match since we have a custom prisma client https://github.com/prisma/prisma/discussions/20924#discussioncomment-10077649
export type PrismaTransaction = OmitPrismaClient;

export default prisma;

export * from "./selects";
