import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { NoopRedisService } from "@calcom/features/redis/NoopRedisService";
import { RedisService } from "@calcom/features/redis/RedisService";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminAssignFeatureToTeamSchema } from "./assignFeatureToTeam.schema";

type AssignFeatureOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TAdminAssignFeatureToTeamSchema;
};

const getRedisClient = () => {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new RedisService();
  }
  return new NoopRedisService();
};

export const assignFeatureToTeamHandler = async ({ ctx, input }: AssignFeatureOptions) => {
  const { prisma, user } = ctx;
  const { teamId, featureId } = input;

  await prisma.teamFeatures.upsert({
    where: {
      teamId_featureId: {
        teamId,
        featureId,
      },
    },
    create: {
      teamId,
      featureId,
      assignedBy: `user:${user.id}`,
    },
    update: {},
  });

  // Clear server-side cache (Redis + in-memory) so next request gets fresh data
  await FeaturesRepository.clearCache(getRedisClient());

  return { success: true };
};

export default assignFeatureToTeamHandler;
