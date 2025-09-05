import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../../types";
import type { TGetTeamFeaturesSchema } from "./getFeatures.schema";

type GetTeamFeaturesOptions = {
  ctx: {
    user: TrpcSessionUser;
    prisma: PrismaClient;
  };
  input: TGetTeamFeaturesSchema;
};

export default async function handler({ ctx, input }: GetTeamFeaturesOptions) {
  const { prisma } = ctx;
  const { teamId } = input;

  const teamFeatures = await prisma.teamFeatures.findMany({
    where: { teamId },
    include: {
      feature: {
        select: {
          slug: true,
          enabled: true,
          type: true,
        },
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
  });

  return teamFeatures;
}
