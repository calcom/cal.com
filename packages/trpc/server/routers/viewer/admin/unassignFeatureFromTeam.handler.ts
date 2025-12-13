import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { NoopRedisService } from "@calcom/features/redis/NoopRedisService";
import { RedisService } from "@calcom/features/redis/RedisService";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminUnassignFeatureFromTeamSchema } from "./unassignFeatureFromTeam.schema";

type UnassignFeatureOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TAdminUnassignFeatureFromTeamSchema;
};

const getRedisClient = () => {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new RedisService();
  }
  return new NoopRedisService();
};

export const unassignFeatureFromTeamHandler = async ({ ctx, input }: UnassignFeatureOptions) => {
  const { prisma } = ctx;
  const { teamId, featureId } = input;

  await prisma.teamFeatures.delete({
    where: {
      teamId_featureId: {
        teamId,
        featureId,
      },
    },
  });

  // Clear server-side cache (Redis + in-memory) so next request gets fresh data
  await FeaturesRepository.clearCache(getRedisClient());

  return { success: true };
};

export default unassignFeatureFromTeamHandler;
