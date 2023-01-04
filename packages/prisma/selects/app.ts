import { Prisma } from "@prisma/client";

export const safeAppSelect = Prisma.validator<Prisma.AppSelect>()({
  slug: true,
  dirName: true,
  /** Omitting to avoid frontend leaks */
  // keys: true,
  categories: true,
  createdAt: true,
  updatedAt: true,
  enabled: true,
});
