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
      enabled: true,
    },
    update: {
      enabled: true,
    },
  });

  return { success: true };
};

export default assignFeatureToTeamHandler;
