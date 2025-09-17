const isE2E = process.env.NEXT_PUBLIC_IS_E2E === "1";

const { PrismaClient } = isE2E
  ? require("../../node_modules/.prisma/test-client")
  : require("@prisma/client");

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = global.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
