import { Prisma, PrismaClient } from "@prisma/client";

import { addPrismaExtensions } from "./extensions";
import { bookingReferenceMiddleware, eventTypeDescriptionParseAndSanitizeMiddleware } from "./middleware";

declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof createPrismaClient> | undefined;
}

const prismaOptions: Prisma.PrismaClientOptions = {};

if (!!process.env.NEXT_PUBLIC_DEBUG) prismaOptions.log = ["query", "error", "warn"];

function createPrismaClient(options: Prisma.PrismaClientOptions) {
  const newPrisma = new PrismaClient(options);
  bookingReferenceMiddleware(newPrisma);
  eventTypeDescriptionParseAndSanitizeMiddleware(newPrisma);
  const xprisma = addPrismaExtensions(newPrisma);
  return xprisma;
}

export const prisma = globalThis.prisma || createPrismaClient(prismaOptions);

export const customPrisma = (options: Prisma.PrismaClientOptions) =>
  createPrismaClient({ ...prismaOptions, ...options });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
// If any changed on middleware server restart is required

export default prisma;

export * from "./selects";
