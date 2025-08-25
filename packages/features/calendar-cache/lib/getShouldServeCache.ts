import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";

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
export interface ICacheService {
  featuresRepository: IFeaturesRepository;
}

export class CacheService {
  constructor(private readonly dependencies: ICacheService) {}

  async getShouldServeCache(shouldServeCache?: boolean | undefined, teamId?: number) {
    if (typeof shouldServeCache === "boolean") return shouldServeCache;
    if (!teamId) return undefined;
    return await this.dependencies.featuresRepository.checkIfTeamHasFeature(teamId, "calendar-cache-serve");
  }
}
