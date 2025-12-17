import { Injectable } from "@nestjs/common";

import type { AppFlags, TeamFeatures } from "@calcom/features/flags/config";
import { FEATURES_CACHE_KEY, FEATURES_CACHE_TTL_MS } from "@calcom/features/flags/features-cache";
import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import type { IRedisService } from "@calcom/features/redis/IRedisService";
import { NoopRedisService } from "@calcom/features/redis/NoopRedisService";
import { RedisService } from "@calcom/features/redis/RedisService";

import { PrismaFeaturesRepository } from "./prisma-features.repository";

function getRedisClient(): IRedisService {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new RedisService();
  }
  return new NoopRedisService();
}

@Injectable()
export class FeaturesRepositoryCachingProxy implements IFeaturesRepository {
  private readonly redisService: IRedisService;

  constructor(private readonly featuresRepository: PrismaFeaturesRepository) {
    this.redisService = getRedisClient();
  }

  // ============ CACHED METHOD ============

  async getAllFeatures(): Promise<{ slug: string; enabled: boolean }[]> {
    const cachedFeatures = await this.getFeaturesCache();
    if (cachedFeatures) {
      return cachedFeatures;
    }

    const features = await this.featuresRepository.getAllFeatures();
    await this.setFeaturesCache(features);
    return features;
  }

  private async getFeaturesCache(): Promise<{ slug: string; enabled: boolean }[] | null> {
    const cachedResult = await this.redisService.get<{ slug: string; enabled: boolean }[]>(
      FEATURES_CACHE_KEY
    );
    return cachedResult;
  }

  private async setFeaturesCache(features: { slug: string; enabled: boolean }[]): Promise<void> {
    await this.redisService.set(FEATURES_CACHE_KEY, features, {
      ttl: FEATURES_CACHE_TTL_MS,
    });
  }

  // ============ METHODS USING CACHED getAllFeatures ============

  async getFeatureFlagMap(): Promise<AppFlags> {
    const flags = await this.getAllFeatures();
    return flags.reduce((acc, flag) => {
      acc[flag.slug as keyof AppFlags] = flag.enabled;
      return acc;
    }, {} as AppFlags);
  }

  async checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags): Promise<boolean> {
    const features = await this.getAllFeatures();
    const flag = features.find((f) => f.slug === slug);
    return Boolean(flag && flag.enabled);
  }

  // ============ PASS-THROUGH METHODS (no caching) ============

  async getTeamFeatures(teamId: number): Promise<TeamFeatures | null> {
    return this.featuresRepository.getTeamFeatures(teamId);
  }

  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    return this.featuresRepository.checkIfUserHasFeature(userId, slug);
  }

  async checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    return this.featuresRepository.checkIfUserHasFeatureNonHierarchical(userId, slug);
  }

  async checkIfTeamHasFeature(teamId: number, featureId: keyof AppFlags): Promise<boolean> {
    return this.featuresRepository.checkIfTeamHasFeature(teamId, featureId);
  }

  async getTeamsWithFeatureEnabled(slug: keyof AppFlags): Promise<number[]> {
    return this.featuresRepository.getTeamsWithFeatureEnabled(slug);
  }

  // ============ PASS-THROUGH STATE-CHANGING METHOD ============

  async enableFeatureForTeam(teamId: number, featureId: keyof AppFlags, assignedBy: string): Promise<void> {
    return this.featuresRepository.enableFeatureForTeam(teamId, featureId, assignedBy);
  }
}
