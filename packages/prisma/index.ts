import type { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import { bookingReferenceMiddleware } from "./middleware";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaOptions: Prisma.PrismaClientOptions = {};

if (!!process.env.NEXT_PUBLIC_DEBUG) prismaOptions.log = ["query", "error", "warn"];

export const prisma = globalThis.prisma || ({} as unknown as PrismaClient);

export const customPrisma = (options: Prisma.PrismaClientOptions) => ({} as unknown as PrismaClient);

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

// If any changed on middleware server restart is required
bookingReferenceMiddleware(prisma);

export default prisma;

export * from "./selects";
