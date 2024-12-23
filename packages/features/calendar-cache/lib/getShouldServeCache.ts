import { FeaturesRepository } from "@calcom/features/flags/features.repository";

export async function getShouldServeCache(shouldServeCache?: boolean | undefined, teamId?: number) {
  if (typeof shouldServeCache === "boolean") return shouldServeCache;
  if (!teamId) return undefined;
  const featureRepo = new FeaturesRepository();
  return await featureRepo.checkIfTeamHasFeature(teamId, "calendar-cache-serve");
}
