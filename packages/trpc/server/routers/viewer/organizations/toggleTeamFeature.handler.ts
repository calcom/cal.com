import type { PrismaClient } from "@calcom/prisma";

import type { TToggleTeamFeatureSchema } from "./toggleTeamFeature.schema";

type ToggleTeamFeatureOptions = {
  ctx: {
    user: { id: number };
    prisma: PrismaClient;
  };
  input: TToggleTeamFeatureSchema;
};

export const toggleTeamFeatureHandler = async (opts: ToggleTeamFeatureOptions) => {
  const { ctx, input } = opts;
  const { prisma, user } = ctx;
  const { teamId, featureSlug, enabled } = input;

  if (enabled) {
    return prisma.teamFeatures.upsert({
      where: {
        teamId_featureId: {
          teamId,
          featureId: featureSlug,
        },
      },
      create: {
        teamId,
        featureId: featureSlug,
        assignedBy: user.id.toString(),
      },
      update: {
        assignedBy: user.id.toString(),
      },
    });
  } else {
    return prisma.teamFeatures.delete({
      where: {
        teamId_featureId: {
          teamId,
          featureId: featureSlug,
        },
      },
    });
  }
};

export default toggleTeamFeatureHandler;
