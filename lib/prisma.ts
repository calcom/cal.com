import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;
const globalAny: any = global;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!globalAny.prisma) {
    globalAny.prisma = new PrismaClient();
  }
  prisma = globalAny.prisma;
}

const whereAndSelect = (modelQuery, criteria: Record<string, unknown>, pluckedAttributes: string[]) =>
  modelQuery({
    where: criteria,
    select: pluckedAttributes.reduce(
      (select: { [string]: boolean }, attr: string) => ({
        ...select,
        [attr]: true,
      }),
      {}
    ),
  });

export { whereAndSelect };

export default prisma;
