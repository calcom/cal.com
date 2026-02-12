//directly using build prisma client build post prisma generate
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export { prisma };
