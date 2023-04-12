import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

import logger from "@calcom/lib/logger";

import { bookingReferenceMiddleware } from "./middleware";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaOptions: Prisma.PrismaClientOptions = {};

if (!!process.env.NEXT_PUBLIC_DEBUG) prismaOptions.log = ["query", "error", "warn"];
const startPrismaClient = performance.now();
export const prisma = globalThis.prisma || new PrismaClient(prismaOptions);
const endPrismaClient = performance.now();
logger.debug(`Prisma client took ${(endPrismaClient - startPrismaClient).toFixed()}ms`);

export const customPrisma = (options: Prisma.PrismaClientOptions) =>
  new PrismaClient({ ...prismaOptions, ...options });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
// If any changed on middleware server restart is required
bookingReferenceMiddleware(prisma);

export default prisma;

export * from "./selects";
