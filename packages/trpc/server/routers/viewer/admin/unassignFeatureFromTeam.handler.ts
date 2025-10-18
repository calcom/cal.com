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

  return { success: true };
};

export default unassignFeatureFromTeamHandler;
