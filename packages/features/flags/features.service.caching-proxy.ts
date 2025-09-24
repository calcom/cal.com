import { BaseCacheProxy } from "../redis/BaseCacheProxy";
import type { CacheConfig } from "../redis/BaseCacheProxy";
import type { IRedisService } from "../redis/IRedisService.d";
import type { AppFlags } from "./config";
import type { IFeaturesService } from "./features.service.interface";

export class FeaturesServiceCachingProxy extends BaseCacheProxy implements IFeaturesService {
  private static readonly CACHE_KEYS = {
    GLOBAL_FEATURE: (slug: string) => `feature:global:${slug}`,
    USER_FEATURE: (userId: number, slug: string) => `feature:user:${userId}:${slug}`,
    TEAM_FEATURE: (teamId: number, slug: string) => `feature:team:${teamId}:${slug}`,
  } as const;

  constructor(
    private readonly targetService: IFeaturesService,
    redisService: IRedisService,
    cacheConfig: CacheConfig = {}
  ) {
    super(redisService, cacheConfig);
  }

  async checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags): Promise<boolean> {
    const cacheKey = this.buildCacheKey(FeaturesServiceCachingProxy.CACHE_KEYS.GLOBAL_FEATURE(slug));

    return this.withCache(cacheKey, () => this.targetService.checkIfFeatureIsEnabledGlobally(slug));
  }

  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    const cacheKey = this.buildCacheKey(FeaturesServiceCachingProxy.CACHE_KEYS.USER_FEATURE(userId, slug));

    return this.withCache(cacheKey, () => this.targetService.checkIfUserHasFeature(userId, slug));
  }

  async checkIfTeamHasFeature(teamId: number, slug: keyof AppFlags): Promise<boolean> {
    const cacheKey = this.buildCacheKey(FeaturesServiceCachingProxy.CACHE_KEYS.TEAM_FEATURE(teamId, slug));

    return this.withCache(cacheKey, () => this.targetService.checkIfTeamHasFeature(teamId, slug));
  }

  /**
   * Invalidate cache entries for a specific pattern
   * Useful for cache invalidation strategies
   */
  async invalidateCache(pattern: "global" | "user" | "team", id?: number): Promise<void> {
    let keyPattern: string;

    switch (pattern) {
      case "global":
        keyPattern = "feature:global:*";
        break;
      case "user":
        if (id === undefined) throw new Error("User ID required for user cache invalidation");
        keyPattern = `feature:user:${id}:*`;
        break;
      case "team":
        if (id === undefined) throw new Error("Team ID required for team cache invalidation");
        keyPattern = `feature:team:${id}:*`;
        break;
      default:
        throw new Error(`Unknown invalidation pattern: ${pattern}`);
    }

    await this.invalidateCachePattern(keyPattern);
  }
}
