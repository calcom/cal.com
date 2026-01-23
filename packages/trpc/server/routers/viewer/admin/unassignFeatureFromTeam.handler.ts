import type { FeatureId } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
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

  const featuresRepository = new FeaturesRepository(prisma);
  await featuresRepository.setTeamFeatureState({
    teamId,
    featureId: featureId as FeatureId,
    state: "inherit",
  });

  return { success: true };
};

export default unassignFeatureFromTeamHandler;
