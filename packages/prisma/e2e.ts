import { getPrismaClient } from "./store/prismaStore";

let _prisma: ReturnType<typeof getPrismaClient>;
export const getPrisma = () => {
  if (!_prisma) {
    _prisma = getPrismaClient();
  }
  return _prisma;
};
// Only export one instance

export const prisma = getPrisma();
