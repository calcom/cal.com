import type { PrismaClient } from "@calcom/prisma";

import type { AppFlags } from "../config";

// This is a temporary cache to avoid hitting the database on every lambda invocation
let TEMP_CACHE: AppFlags | null = null;

export async function getFeatureFlagMap(prisma: PrismaClient) {
  // If we've already fetched the flags, return them
  if (TEMP_CACHE) return TEMP_CACHE;
  const flags = await prisma.feature.findMany({
    orderBy: { slug: "asc" },
    cacheStrategy: { swr: 300, ttl: 300 },
  });
  TEMP_CACHE = flags.reduce((acc, flag) => {
    acc[flag.slug as keyof AppFlags] = flag.enabled;
    return acc;
  }, {} as AppFlags);
  return TEMP_CACHE;
}
