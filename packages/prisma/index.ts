import { PrismaClient } from "@prisma/client";

import { bookingReferenceMiddleware } from "./middleware";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    // log: ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
// If any changed on middleware server restart is required
bookingReferenceMiddleware(prisma);

export default prisma;

export * from "./selects";
