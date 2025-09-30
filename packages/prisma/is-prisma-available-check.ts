import { prisma } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

export async function isPrismaAvailableCheck(): Promise<boolean> {
  try {
    await prisma.$queryRaw<unknown[]>(Prisma.sql`SELECT 1`);
    await prisma.$disconnect();
    return true;
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientInitializationError) {
      return false;
    }
    throw e;
  }
}
