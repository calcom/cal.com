import type { Prisma } from "@prisma/client";
import { PrismaClient as PrismaClientWithoutExtension } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

import auditLogExtension from "./extensions/audit-log-extension";
import { bookingIdempotencyKeyExtension } from "./extensions/booking-idempotency-key";
import { excludePendingPaymentsExtension } from "./extensions/exclude-pending-payment-teams";
import nullifyActorUserId_and_SubsitituteAuditLogFields from "./extensions/nullify-actorUserId-and-subsititute-audit-log-fields-extension";
import { bookingReferenceMiddleware } from "./middleware";

const prismaOptions: Prisma.PrismaClientOptions = {};

const globalForPrisma = global as unknown as {
  prismaWithoutClientExtensions: PrismaClientWithoutExtension;
  prismaWithClientExtensions: PrismaClientWithExtensions;
};

if (!!process.env.NEXT_PUBLIC_DEBUG) prismaOptions.log = ["query", "error", "warn"];

// Prevents flooding with idle connections
const prismaWithoutClientExtensions =
  globalForPrisma.prismaWithoutClientExtensions || new PrismaClientWithoutExtension(prismaOptions);

const isAuditLogEnabled = !!process.env.AUDIT_LOG_ENABLED;

export const customPrisma = (options?: Prisma.PrismaClientOptions) =>
  isAuditLogEnabled
    ? new PrismaClientWithoutExtension({ ...prismaOptions, ...options })
        .$extends(auditLogExtension())
        .$extends(excludePendingPaymentsExtension())
        .$extends(bookingIdempotencyKeyExtension())
        .$extends(withAccelerate())
    : new PrismaClientWithoutExtension({ ...prismaOptions, ...options })
        .$extends(nullifyActorUserId_and_SubsitituteAuditLogFields())
        .$extends(excludePendingPaymentsExtension())
        .$extends(bookingIdempotencyKeyExtension())
        .$extends(withAccelerate());

// If any changed on middleware server restart is required
// TODO: Migrate it to $extends
bookingReferenceMiddleware(prismaWithoutClientExtensions);

// FIXME: Due to some reason, there are types failing in certain places due to the $extends. Fix it and then enable it
// Specifically we get errors like `Type 'string | Date | null | undefined' is not assignable to type 'Exact<string | Date | null | undefined, string | Date | null | undefined>'`
const prismaWithClientExtensions = isAuditLogEnabled
  ? prismaWithoutClientExtensions
      .$extends(auditLogExtension())
      .$extends(excludePendingPaymentsExtension())
      .$extends(bookingIdempotencyKeyExtension())
      .$extends(withAccelerate())
  : prismaWithoutClientExtensions
      .$extends(nullifyActorUserId_and_SubsitituteAuditLogFields())
      .$extends(excludePendingPaymentsExtension())
      .$extends(bookingIdempotencyKeyExtension())
      .$extends(withAccelerate());

export const prisma = globalForPrisma.prismaWithClientExtensions || prismaWithClientExtensions;

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
export default prisma;

export * from "./selects";
