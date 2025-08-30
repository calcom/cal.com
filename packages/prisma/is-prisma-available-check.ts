import { Prisma } from "@prisma/client";

import prisma from ".";

export async function isPrismaAvailableCheck() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientInitializationError) {
      // Database might not available at build time.
      return false;
    } else {
      throw e;
    }
  }
}
