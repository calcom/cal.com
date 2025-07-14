import { BaseCacheProxy } from "@calcom/lib/BaseCacheProxy";

import type { AppFlags } from "./config";
import { FeaturesRepository } from "./features.repository";
import type { IFeaturesRepository } from "./features.repository.interface";

/**
 * Caching proxy for FeaturesRepository that adds Redis caching layer.
 * Falls back gracefully to the original repository when Redis is unavailable.
 */
export class CachedFeaturesRepository
  extends BaseCacheProxy<IFeaturesRepository, FeaturesRepository>
  implements IFeaturesRepository
{
  constructor(featuresRepository?: FeaturesRepository) {
    super(featuresRepository || new FeaturesRepository(), "features");
  }

  async checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags): Promise<boolean> {
    const cacheKey = this.buildCacheKey("global", slug);

    return this.withCache(
      cacheKey,
      () => this.repository.checkIfFeatureIsEnabledGlobally(slug),
      "global feature check"
    );
  }

  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    const cacheKey = this.buildCacheKey("user", userId, slug);

    return this.withCache(
      cacheKey,
      () => this.repository.checkIfUserHasFeature(userId, slug),
      "user feature check"
    );
  }

  async checkIfTeamHasFeature(teamId: number, slug: keyof AppFlags): Promise<boolean> {
    const cacheKey = this.buildCacheKey("team", teamId, slug);

    return this.withCache(
      cacheKey,
      () => this.repository.checkIfTeamHasFeature(teamId, slug),
      "team feature check"
    );
  }

  async getAllFeatures() {
    return this.withoutCache(() => this.repository.getAllFeatures());
  }

  async getFeatureFlagMap() {
    return this.withoutCache(() => this.repository.getFeatureFlagMap());
  }

  async getTeamFeatures(teamId: number) {
    return this.withoutCache(() => this.repository.getTeamFeatures(teamId));
  }

  async invalidateCache(userId?: number, teamId?: number, slug?: string) {
    const keysToDelete: string[] = [];

    if (slug) {
      keysToDelete.push(this.buildCacheKey("global", slug));
      if (userId) {
        keysToDelete.push(this.buildCacheKey("user", userId, slug));
      }
      if (teamId) {
        keysToDelete.push(this.buildCacheKey("team", teamId, slug));
      }
    }

    await this.invalidateKeys(keysToDelete);
  }
}
