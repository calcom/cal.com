import type { PrismaClient } from "@calcom/prisma";

import type { AppFlags } from "../config";

export async function getFeatureFlagMap(prisma: PrismaClient) {
  const flags = await prisma.feature.findMany({
    orderBy: { slug: "asc" },
    cacheStrategy: { swr: 300, ttl: 300 },
  });
  return flags.reduce<AppFlags>((acc, flag) => {
    acc[flag.slug as keyof AppFlags] = flag.enabled;
    return acc;
  }, {} as AppFlags);
}
