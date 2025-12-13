import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { NoopRedisService } from "@calcom/features/redis/NoopRedisService";
import { RedisService } from "@calcom/features/redis/RedisService";
import type { PrismaClient } from "@calcom/prisma";

import type { TAdminToggleFeatureFlagSchema } from "./toggleFeatureFlag.schema";

type GetOptions = {
  ctx: {
    user: { id: number };
    prisma: PrismaClient;
  };
  input: TAdminToggleFeatureFlagSchema;
};

const getRedisClient = () => {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new RedisService();
  }
  return new NoopRedisService();
};

export const toggleFeatureFlagHandler = async (opts: GetOptions) => {
  const { ctx, input } = opts;
  const { prisma, user } = ctx;
  const { slug, enabled } = input;
  const result = await prisma.feature.update({
    where: { slug },
    data: { enabled, updatedBy: user.id },
  });
  // Clear server-side cache (Redis + in-memory) so next request gets fresh data
  await FeaturesRepository.clearCache(getRedisClient());
  return result;
};

export default toggleFeatureFlagHandler;
