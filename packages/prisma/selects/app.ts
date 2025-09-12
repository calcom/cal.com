import type { Prisma } from "@calcom/prisma/client";

export const safeAppSelect = {
  slug: true,
  dirName: true,
  /** Omitting to avoid frontend leaks */
  // keys: true,
  categories: true,
  createdAt: true,
  updatedAt: true,
  enabled: true,
} satisfies Prisma.AppSelect;
