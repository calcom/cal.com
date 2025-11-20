import { TRPCError } from "@trpc/server";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { PrismaClient } from "@calcom/prisma";

import type { TUnassignFeatureFromTeamSchema } from "./unassignFeatureFromTeam.schema";

type UnassignFeatureFromTeamOptions = {
  ctx: {
    user: { id: number; organizationId: number | null };
    prisma: PrismaClient;
  };
  input: TUnassignFeatureFromTeamSchema;
};

export const unassignFeatureFromTeamHandler = async (opts: UnassignFeatureFromTeamOptions) => {
  const { ctx, input } = opts;
  const { prisma, user } = ctx;
  const { teamId, featureId } = input;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { parentId: true },
  });

  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  if (team.parentId !== user.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Team does not belong to your organization",
    });
  }

  const featuresRepository = new FeaturesRepository(prisma);
  await featuresRepository.disableFeatureForTeam(teamId, featureId);
};

export default unassignFeatureFromTeamHandler;
