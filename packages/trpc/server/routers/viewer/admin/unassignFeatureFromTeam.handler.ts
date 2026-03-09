import { getTeamFeatureRepository } from "@calcom/features/di/containers/TeamFeatureRepository";
import type { FeatureId } from "@calcom/features/flags/config";
import type { TAdminUnassignFeatureFromTeamSchema } from "./unassignFeatureFromTeam.schema";

type UnassignFeatureOptions = {
  input: TAdminUnassignFeatureFromTeamSchema;
};

export const unassignFeatureFromTeamHandler = async ({ input }: UnassignFeatureOptions) => {
  const { teamId, featureId } = input;

  const teamFeatureRepository = getTeamFeatureRepository();
  await teamFeatureRepository.delete(teamId, featureId as FeatureId);

  return { success: true };
};

export default unassignFeatureFromTeamHandler;
