import type { PrismaClient } from "@calcom/prisma";

import type { AppFlags } from "../config";

export async function getFeatureFlagMap(prisma: PrismaClient) {
  const flags = await prisma.feature.findMany({
    orderBy: { slug: "asc" },
    cacheStrategy: { swr: 300, ttl: 300 },
  });
  return flags.reduce((acc, flag) => {
    acc[flag.slug as keyof AppFlags] = flag.enabled;
    return acc;
  }, {} as Partial<AppFlags>);
}

interface CacheEntry {
  value: boolean; // adapt to other supported value types in the future
  expiry: number;
}

const featureFlagCache = new Map<keyof AppFlags, CacheEntry>();

const isExpired = (entry: CacheEntry): boolean => {
  return Date.now() > entry.expiry;
};

export const getFeatureFlag = async (prisma: PrismaClient, slug: keyof AppFlags): Promise<boolean> => {
  const cacheEntry = featureFlagCache.get(slug);

  // Check if the flag is in the cache and not expired
  if (cacheEntry && !isExpired(cacheEntry)) {
    return cacheEntry.value;
  }

  // Fetch from the database if not in cache or cache is expired
  const flag = await prisma.feature.findUnique({
    where: {
      slug,
    },
  });

  const isEnabled = Boolean(flag && flag.enabled);

  // Calculate expiry time (current time + 5 minutes)
  const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes in milliseconds

  // Store the flag in the cache with its expiry time
  featureFlagCache.set(slug, { value: isEnabled, expiry });

  return isEnabled;
};
