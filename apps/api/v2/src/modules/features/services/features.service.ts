import { Injectable, Logger } from "@nestjs/common";

import type { AppFlags } from "@calcom/features/flags/config";
import { CachedFeaturesRepository } from "@calcom/features/flags/features.repository.cached";

@Injectable()
export class FeaturesService {
  private readonly logger = new Logger("FeaturesService");

  constructor(private readonly featuresRepository: CachedFeaturesRepository) {}

  async checkGlobalFeature(slug: keyof AppFlags): Promise<boolean> {
    this.logger.debug(`Checking global feature: ${slug}`);
    return this.featuresRepository.checkIfFeatureIsEnabledGlobally(slug);
  }

  async checkUserFeature(userId: number, slug: string): Promise<boolean> {
    this.logger.debug(`Checking user feature: ${slug} for user: ${userId}`);
    return this.featuresRepository.checkIfUserHasFeature(userId, slug);
  }

  async checkTeamFeature(teamId: number, slug: keyof AppFlags): Promise<boolean> {
    this.logger.debug(`Checking team feature: ${slug} for team: ${teamId}`);
    return this.featuresRepository.checkIfTeamHasFeature(teamId, slug);
  }

  async getAllFeatures() {
    this.logger.debug("Retrieving all features");
    return this.featuresRepository.getAllFeatures();
  }

  async getFeatureFlagMap() {
    this.logger.debug("Retrieving feature flag map");
    return this.featuresRepository.getFeatureFlagMap();
  }

  async getTeamFeatures(teamId: number) {
    this.logger.debug(`Retrieving features for team: ${teamId}`);
    return this.featuresRepository.getTeamFeatures(teamId);
  }

  async invalidateFeatureCache(userId?: number, teamId?: number, slug?: string) {
    this.logger.debug(`Invalidating feature cache - userId: ${userId}, teamId: ${teamId}, slug: ${slug}`);
    return this.featuresRepository.invalidateCache(userId, teamId, slug);
  }

  async isFeatureEnabledForContext(
    slug: keyof AppFlags,
    context: { userId?: number; teamId?: number }
  ): Promise<boolean> {
    this.logger.debug(`Checking feature ${slug} for context:`, context);

    if (context.teamId) {
      return this.checkTeamFeature(context.teamId, slug);
    }

    if (context.userId) {
      return this.checkUserFeature(context.userId, slug);
    }

    return this.checkGlobalFeature(slug);
  }

  async getFeatureStatus(slug: keyof AppFlags, context: { userId?: number; teamId?: number }) {
    const isEnabled = await this.isFeatureEnabledForContext(slug, context);

    return {
      feature: slug,
      enabled: isEnabled,
      context,
      checkedAt: new Date().toISOString(),
    };
  }
}
