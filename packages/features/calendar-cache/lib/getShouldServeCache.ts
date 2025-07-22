import { FeaturesRepository } from "@calcom/features/flags/features.repository";

export async function getShouldServeCache(shouldServeCache?: boolean | undefined, teamId?: number) {
  if (typeof shouldServeCache === "boolean") return shouldServeCache;
  const featureRepo = new FeaturesRepository();

  let serve;
  if (teamId) {
    serve = await featureRepo.checkIfTeamHasFeature(teamId, "calendar-cache-serve");
  } else {
    serve = await featureRepo.checkIfFeatureIsEnabledGlobally("calendar-cache");
  }

  return serve;
}
