import { PrismaClient } from "@prisma/client";
import useAccelerate from "@prisma/extension-accelerate";

export const extendedPrisma = new PrismaClient().$extends(useAccelerate);
