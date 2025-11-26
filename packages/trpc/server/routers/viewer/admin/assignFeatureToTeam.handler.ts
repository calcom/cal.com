import { FeaturesRepository } from "@calcom/features/flags/features.repository";
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

  // Clear server-side in-memory cache so next request gets fresh data
  FeaturesRepository.clearCache();

  return { success: true };
};

export default assignFeatureToTeamHandler;
