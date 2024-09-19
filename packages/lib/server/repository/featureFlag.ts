import type { AppFlags } from "@calcom/features/flags/config";
import { prisma } from "@calcom/prisma";

export class FeatureFlagRepository {
  static async getFeatureFlags() {
    return prisma.feature.findMany({
      orderBy: { slug: "asc" },
      cacheStrategy: { swr: 300, ttl: 300 },
    });
  }

  static async getFeatureFlagMap() {
    const flags = await prisma.feature.findMany({
      orderBy: { slug: "asc" },
      cacheStrategy: { swr: 300, ttl: 300 },
    });
    return flags.reduce((acc, flag) => {
      acc[flag.slug as keyof AppFlags] = flag.enabled;
      return acc;
    }, {} as Partial<AppFlags>);
  }
}
