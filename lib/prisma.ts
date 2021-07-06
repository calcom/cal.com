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

const pluck = (select: Record<string, boolean>, attr: string) => {
  const parts = attr.split(".");
  const alwaysAttr = parts[0];
  const pluckedValue =
    parts.length > 1
      ? {
          select: pluck(select[alwaysAttr] ? select[alwaysAttr].select : {}, parts.slice(1).join(".")),
        }
      : true;
  return {
    ...select,
    [alwaysAttr]: pluckedValue,
  };
};

const whereAndSelect = (modelQuery, criteria: Record<string, unknown>, pluckedAttributes: string[]) =>
  modelQuery({
    where: criteria,
    select: pluckedAttributes.reduce(pluck, {}),
  });

export { whereAndSelect };

export default prisma;
