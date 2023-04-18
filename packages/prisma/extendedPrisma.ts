import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import useAccelerate from "@prisma/extension-accelerate";

export type ExtendedPrismaClient = ReturnType<typeof extendedPrismaClient>;

export const extendedPrismaClient = (options: Prisma.PrismaClientOptions) =>
  new PrismaClient({ ...options }).$extends(useAccelerate);
