import type { AppFlags } from "./config";
import type { IFeaturesRepository } from "./features.repository.interface";
import type { IFeaturesService } from "./features.service.interface";

/**
 * Clean service implementation that delegates to the repository.
 * Caching is handled by the FeaturesServiceCachingProxy when needed.
 */
export class FeaturesService implements IFeaturesService {
  constructor(private readonly featuresRepository: IFeaturesRepository) {}

  async checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags): Promise<boolean> {
    return this.featuresRepository.checkIfFeatureIsEnabledGlobally(slug);
  }

  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    return this.featuresRepository.checkIfUserHasFeature(userId, slug);
  }

  async checkIfTeamHasFeature(teamId: number, slug: keyof AppFlags): Promise<boolean> {
    return this.featuresRepository.checkIfTeamHasFeature(teamId, slug);
  }
}
