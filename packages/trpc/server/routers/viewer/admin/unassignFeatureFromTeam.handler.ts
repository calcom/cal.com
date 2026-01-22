import { getTeamFeatureRepository } from "@calcom/features/di/containers/TeamFeatureRepository";
import type { FeatureId } from "@calcom/features/flags/config";
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
  const { teamId, featureId } = input;

  const teamFeatureRepository = getTeamFeatureRepository();
  await teamFeatureRepository.setState({
    teamId,
    featureId: featureId as FeatureId,
    state: "inherit",
  });

  return { success: true };
};

export default unassignFeatureFromTeamHandler;
