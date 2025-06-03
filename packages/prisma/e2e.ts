import { getPrismaClient } from "./store/prismaStore";

let prisma: ReturnType<typeof getPrismaClient>;
export const getPrisma = () => {
  if (!prisma) {
    prisma = getPrismaClient();
  }
  return prisma;
};
// Only export one instance
export { prisma };
