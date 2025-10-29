import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import { CalendarSubscriptionService } from "calendar-subscription/lib/CalendarSubscriptionService";

export interface ICacheService {
  featuresRepository: IFeaturesRepository;
}

export class CacheService {
  constructor(private readonly dependencies: ICacheService) {}

  async getShouldServeCache(shouldServeCache?: boolean | undefined, teamId?: number) {
    if (typeof shouldServeCache === "boolean") return shouldServeCache;
    if (!teamId) return false;
    return await this.dependencies.featuresRepository.checkIfTeamHasFeature(teamId, CalendarSubscriptionService.CALENDAR_SUBSCRIPTION_CACHE_FEATURE);
  }
}
