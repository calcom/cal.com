import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

import { bookingReferenceMiddleware } from "./middleware";

declare global {
  // eslint-disable-next-line no-var
  var prisma: typeof prismaWithClientExtensions;
}

const prismaOptions: Prisma.PrismaClientOptions = {};

if (!!process.env.NEXT_PUBLIC_DEBUG) prismaOptions.log = ["query", "error", "warn"];

const prismaWithoutClientExtensions = new PrismaClient(prismaOptions);

export const customPrisma = (options: Prisma.PrismaClientOptions) =>
  new PrismaClient({ ...prismaOptions, ...options });

// If any changed on middleware server restart is required
bookingReferenceMiddleware(prismaWithoutClientExtensions);

// FIXME: Due to some reason, there are types failing in certain places due to the $extends. Fix it and then enable it
// const prismaWithClientExtensions = prismaWithoutClientExtensions.$extends({
//   query: {
//     // $allModels: {
//     //   async $allOperations({ model, operation, args, query }) {
//     //     const start = performance.now();
//     //     /* your custom logic here */
//     //     const res = await query(args);
//     //     const end = performance.now();
//     //     logger.debug("Query Perf: ", `${model}.${operation} took ${(end - start).toFixed(2)}ms\n`);
//     //     return res;
//     //   },
//     // },
//   },
// });
const prismaWithClientExtensions = prismaWithoutClientExtensions;

export const prisma = (globalThis.prisma as typeof prismaWithClientExtensions) || prismaWithClientExtensions;

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export type PrismaType = typeof prisma;
export default prisma;

export * from "./selects";
