import type { PrismaClient } from "@prisma/client";

import type { AppFlags } from "../config";

export async function getFeatureFlagMap(prisma: PrismaClient) {
  const flags = await prisma.feature.findMany({
    orderBy: { slug: "asc" },
  });
  return flags.reduce<AppFlags>((fs, f) => {
    fs[f.slug as keyof AppFlags] = f.enabled;
    return fs;
  }, {} as unknown as AppFlags);
}
