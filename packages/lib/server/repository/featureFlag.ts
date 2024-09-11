import prisma from "@calcom/prisma";

export class FeatureFlagRepository {
  static async getFeatureFlags() {
    return prisma.feature.findMany({
      orderBy: { slug: "asc" },
      cacheStrategy: { swr: 300, ttl: 300 },
    });
  }
}
