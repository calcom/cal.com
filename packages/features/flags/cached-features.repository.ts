import type { IRedisService } from "@calcom/features/redis/IRedisService";

import type { FeatureId, FeatureState } from "./config";
import { FeaturesCacheKeys } from "./features-cache-keys";
import type { IFeaturesRepository } from "./features.repository.interface";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_CACHE_BUSTER = "0";

export class CachedFeaturesRepository implements IFeaturesRepository {
  private readonly cacheTtlMs: number;

  constructor(
    private readonly featuresRepository: IFeaturesRepository,
    private readonly redisService: IRedisService,
    options?: { cacheTtlMs?: number }
  ) {
    this.cacheTtlMs = options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  }

  private async getCacheBuster(): Promise<string> {
    const cacheBuster = await this.redisService.get<string>(FeaturesCacheKeys.cacheBuster());
    return cacheBuster ?? DEFAULT_CACHE_BUSTER;
  }

  private async invalidateCache(): Promise<void> {
    const newCacheBuster = FeaturesCacheKeys.generateCacheBuster();
    await this.redisService.set(FeaturesCacheKeys.cacheBuster(), newCacheBuster);
  }

  async checkIfFeatureIsEnabledGlobally(slug: FeatureId): Promise<boolean> {
    const cacheBuster = await this.getCacheBuster();
    const cacheKey = FeaturesCacheKeys.globalFeature(cacheBuster, slug);

    const cached = await this.redisService.get<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.checkIfFeatureIsEnabledGlobally(slug);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    const cacheBuster = await this.getCacheBuster();
    const cacheKey = FeaturesCacheKeys.userFeature(cacheBuster, userId, slug);

    const cached = await this.redisService.get<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.checkIfUserHasFeature(userId, slug);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    const cacheBuster = await this.getCacheBuster();
    const cacheKey = FeaturesCacheKeys.userFeatureNonHierarchical(cacheBuster, userId, slug);

    const cached = await this.redisService.get<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.checkIfUserHasFeatureNonHierarchical(userId, slug);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async checkIfTeamHasFeature(teamId: number, slug: FeatureId): Promise<boolean> {
    const cacheBuster = await this.getCacheBuster();
    const cacheKey = FeaturesCacheKeys.teamFeature(cacheBuster, teamId, slug);

    const cached = await this.redisService.get<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.checkIfTeamHasFeature(teamId, slug);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async getTeamsWithFeatureEnabled(slug: FeatureId): Promise<number[]> {
    const cacheBuster = await this.getCacheBuster();
    const cacheKey = FeaturesCacheKeys.teamsWithFeatureEnabled(cacheBuster, slug);

    const cached = await this.redisService.get<number[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.getTeamsWithFeatureEnabled(slug);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async setUserFeatureState(
    input:
      | { userId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { userId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    await this.featuresRepository.setUserFeatureState(input);
    await this.invalidateCache();
  }

  async setTeamFeatureState(
    input:
      | { teamId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { teamId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    await this.featuresRepository.setTeamFeatureState(input);
    await this.invalidateCache();
  }

  async getUserFeatureStates(input: {
    userId: number;
    featureIds: FeatureId[];
  }): Promise<Record<string, FeatureState>> {
    const cacheBuster = await this.getCacheBuster();
    const cacheKey = FeaturesCacheKeys.userFeatureStates(cacheBuster, input.userId, input.featureIds);

    const cached = await this.redisService.get<Record<string, FeatureState>>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.getUserFeatureStates(input);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async getTeamsFeatureStates(input: {
    teamIds: number[];
    featureIds: FeatureId[];
  }): Promise<Record<string, Record<number, FeatureState>>> {
    const cacheBuster = await this.getCacheBuster();
    const cacheKey = FeaturesCacheKeys.teamsFeatureStates(cacheBuster, input.teamIds, input.featureIds);

    const cached = await this.redisService.get<Record<string, Record<number, FeatureState>>>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.getTeamsFeatureStates(input);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async getUserAutoOptIn(userId: number): Promise<boolean> {
    const cacheBuster = await this.getCacheBuster();
    const cacheKey = FeaturesCacheKeys.userAutoOptIn(cacheBuster, userId);

    const cached = await this.redisService.get<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.getUserAutoOptIn(userId);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async getTeamsAutoOptIn(teamIds: number[]): Promise<Record<number, boolean>> {
    const cacheBuster = await this.getCacheBuster();
    const cacheKey = FeaturesCacheKeys.teamsAutoOptIn(cacheBuster, teamIds);

    const cached = await this.redisService.get<Record<number, boolean>>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.getTeamsAutoOptIn(teamIds);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async setUserAutoOptIn(userId: number, enabled: boolean): Promise<void> {
    await this.featuresRepository.setUserAutoOptIn(userId, enabled);
    await this.invalidateCache();
  }

  async setTeamAutoOptIn(teamId: number, enabled: boolean): Promise<void> {
    await this.featuresRepository.setTeamAutoOptIn(teamId, enabled);
    await this.invalidateCache();
  }
}
