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

interface CacheEntry {
  value: boolean; // adapt to other supported value types in the future
  expiry: number;
}

interface CacheOptions {
  ttl: number; // time in ms
}

const featureFlagCache = new Map<keyof AppFlags, CacheEntry>();

const isExpired = (entry: CacheEntry): boolean => {
  return Date.now() > entry.expiry;
};

export const getFeatureFlag = async (
  prisma: PrismaClient,
  slug: keyof AppFlags,
  options: CacheOptions = { ttl: 5 * 60 * 1000 }
): Promise<boolean> => {
  // pre-compute all app flags, each one will independelty reload it's own state after expiry.

  if (featureFlagCache.size === 0) {
    const flags = await prisma.feature.findMany({ orderBy: { slug: "asc" } });
    flags.forEach((flag) => {
      featureFlagCache.set(flag.slug as keyof AppFlags, {
        value: flag.enabled,
        expiry: Date.now() + options.ttl,
      });
    });
  }

  const cacheEntry = featureFlagCache.get(slug);

  if (cacheEntry && !isExpired(cacheEntry)) {
    return cacheEntry.value;
  }

  const flag = await prisma.feature.findUnique({
    where: {
      slug,
    },
  });

  const isEnabled = Boolean(flag && flag.enabled);
  const expiry = Date.now() + options.ttl;

  featureFlagCache.set(slug, { value: isEnabled, expiry });

  return isEnabled;
};
