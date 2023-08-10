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

export const prisma = globalThis.prisma || new PrismaClient(prismaOptions);

export const customPrisma = (options: Prisma.PrismaClientOptions) =>
  new PrismaClient({ ...prismaOptions, ...options });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
// If any changed on middleware server restart is required
bookingReferenceMiddleware(prisma);

const prismaWithClientExtensions = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = performance.now();
        /* your custom logic here */
        const res = await query(args);
        const end = performance.now();
        logger.debug("Query Perf: ", `${model}.${operation} took ${(end - start).toFixed(2)}ms\n`);
        return res;
      },
    },
  },
});

export default prismaWithClientExtensions;

export * from "./selects";
