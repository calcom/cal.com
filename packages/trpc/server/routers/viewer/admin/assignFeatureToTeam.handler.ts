import { getTeamFeatureRepository } from "@calcom/features/di/containers/TeamFeatureRepository";
import type { FeatureId } from "@calcom/features/flags/config";
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
  const { user } = ctx;
  const { teamId, featureId } = input;

  const teamFeatureRepository = getTeamFeatureRepository();
  await teamFeatureRepository.setState({
    teamId,
    featureId: featureId as FeatureId,
    state: "enabled",
    assignedBy: `user:${user.id}`,
  });

  return { success: true };
};

export default assignFeatureToTeamHandler;
