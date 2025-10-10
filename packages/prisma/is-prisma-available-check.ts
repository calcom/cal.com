import { Prisma } from "./client";

export async function isPrismaAvailableCheck(): Promise<boolean> {
  try {
    const { PrismaClient } = await import("./client");
    const prisma = new PrismaClient();

    await prisma.$queryRawUnsafe("SELECT 1");
    await prisma.$disconnect();
    return true;
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientInitializationError) {
      return false;
    }
    throw e;
  }
}
