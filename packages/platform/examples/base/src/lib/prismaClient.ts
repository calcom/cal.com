import { PrismaClient } from "@prisma/client";
import { withOptimize } from "@prisma/extension-optimize";

const prismaClientSingleton = () => {
  return new PrismaClient().$extends(withOptimize());
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = global.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
