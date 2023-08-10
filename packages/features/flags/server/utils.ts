import type { PrismaType } from "@calcom/prisma";

import type { AppFlags } from "../config";

export async function getFeatureFlagMap(prisma: PrismaType) {
  const flags = await prisma.feature.findMany({
    orderBy: { slug: "asc" },
  });
  return flags.reduce<AppFlags>((acc, flag) => {
    acc[flag.slug as keyof AppFlags] = flag.enabled;
    return acc;
  }, {} as AppFlags);
}
