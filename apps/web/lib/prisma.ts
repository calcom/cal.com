import { PrismaClient } from "@prisma/client";

import { IS_PRODUCTION } from "@lib/config/constants";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    log: [
      {
        emit: "event",
        level: "query",
      },
      {
        emit: "stdout",
        level: "error",
      },
      {
        emit: "stdout",
        level: "info",
      },
      {
        emit: "stdout",
        level: "warn",
      },
    ],
  });

if (!globalThis.prisma) {
  prisma.$on("query", (e) => {
    console.log(`Duration: ${e.duration}ms for PG Query: ${e.query}`);
  });
  prisma.$use(async (params, next) => {
    const before = Date.now();
    // These logs might be printed later.
    console.log(`Prisma Query Started: ${params.model}.${params.action} at ${before}`);
    const result = await next(params);

    const after = Date.now();
    console.log(`Prisma Query Ended: ${params.model}.${params.action} took ${after - before}ms`);

    return result;
  });
}
if (!IS_PRODUCTION) {
  globalThis.prisma = prisma;
}

export default prisma;
