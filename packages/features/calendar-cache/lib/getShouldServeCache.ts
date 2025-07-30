import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";

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

const _getShouldServeCache = async (shouldServeCache?: boolean | undefined, teamId?: number) => {
  throw new Error("Use CacheService with dependency injection instead");
};

export const getShouldServeCache = _getShouldServeCache;
