import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

import { CAL_URL } from "@calcom/lib/constants";

import { bookingReferenceMiddleware } from "./middleware";

declare global {
  // eslint-disable-next-line no-var
  var prisma: CustomPrisma | undefined;
}

export type CustomPrisma = ReturnType<typeof customPrisma>;

export const customPrisma = (options: Prisma.PrismaClientOptions) => new PrismaClient(options);

const prismaOptions: Prisma.PrismaClientOptions = {};

if (!!process.env.NEXT_PUBLIC_DEBUG) prismaOptions.log = ["query", "error", "warn"];

export const prisma = globalThis.prisma || customPrisma(prismaOptions);

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
// If any changed on middleware server restart is required
bookingReferenceMiddleware(prisma);

export const extendedPrisma = prisma.$extends({
  result: {
    user: {
      avatar: {
        needs: { username: true },
        compute: (user) => `${CAL_URL}/${user.username}/avatar.png`,
      },
    },
  },
});

export type ExtendedPrismaClient = typeof extendedPrisma;

export default extendedPrisma;

export * from "./selects";
