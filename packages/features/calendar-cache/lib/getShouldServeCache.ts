import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";

/**
 * @deprecated This interface is deprecated and will be removed in a future version.
 * Use the new calendar-cache-sql feature instead.
 */
export interface ICacheService {
  featuresRepository: IFeaturesRepository;
}

/**
 * @deprecated This class is deprecated and will be removed in a future version.
 * Use the new calendar-cache-sql feature instead.
 */
export class CacheService {
  /**
   * @deprecated This constructor is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  constructor(private readonly dependencies: ICacheService) {}

  /**
   * @deprecated This method is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  async getShouldServeCache(shouldServeCache?: boolean | undefined, teamId?: number) {
    if (typeof shouldServeCache === "boolean") return shouldServeCache;
    if (!teamId) return undefined;
    return await this.dependencies.featuresRepository.checkIfTeamHasFeature(teamId, "calendar-cache-serve");
  }
}
