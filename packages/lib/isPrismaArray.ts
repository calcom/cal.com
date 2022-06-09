import type { Prisma } from "@prisma/client";

const isPrismaArray = (array: unknown): array is Prisma.JsonArray => {
  return typeof array === "object" && Array.isArray(array);
};

export default isPrismaArray;
