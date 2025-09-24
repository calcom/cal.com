import { captureException } from "@sentry/nextjs";

import type { IRedisService } from "../redis/IRedisService.d";
import type { AppFlags } from "./config";
import type { IFeaturesService } from "./features.service.interface";

export class FeaturesServiceCachingProxy implements IFeaturesService {
  private static readonly CACHE_KEYS = {
    GLOBAL_FEATURE: (slug: string) => `feature:global:${slug}`,
    USER_FEATURE: (userId: number, slug: string) => `feature:user:${userId}:${slug}`,
    TEAM_FEATURE: (teamId: number, slug: string) => `feature:team:${teamId}:${slug}`,
  } as const;

  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  private static readonly CACHE_ERROR_TTL = 60 * 1000; // 1 minute for error states

  constructor(
    private readonly targetService: IFeaturesService,
    private readonly redisService: IRedisService,
    private readonly cacheConfig: {
      defaultTtl?: number;
      errorTtl?: number;
      enableErrorCaching?: boolean;
      keyPrefix?: string;
    } = {}
  ) {}

  async checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags): Promise<boolean> {
    const cacheKey = this.buildCacheKey(FeaturesServiceCachingProxy.CACHE_KEYS.GLOBAL_FEATURE(slug));

    return this.withCache(
      cacheKey,
      () => this.targetService.checkIfFeatureIsEnabledGlobally(slug),
      this.cacheConfig.defaultTtl ?? FeaturesServiceCachingProxy.DEFAULT_TTL
    );
  }

  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    const cacheKey = this.buildCacheKey(FeaturesServiceCachingProxy.CACHE_KEYS.USER_FEATURE(userId, slug));

    return this.withCache(
      cacheKey,
      () => this.targetService.checkIfUserHasFeature(userId, slug),
      this.cacheConfig.defaultTtl ?? FeaturesServiceCachingProxy.DEFAULT_TTL
    );
  }

  async checkIfTeamHasFeature(teamId: number, slug: keyof AppFlags): Promise<boolean> {
    const cacheKey = this.buildCacheKey(FeaturesServiceCachingProxy.CACHE_KEYS.TEAM_FEATURE(teamId, slug));

    return this.withCache(
      cacheKey,
      () => this.targetService.checkIfTeamHasFeature(teamId, slug),
      this.cacheConfig.defaultTtl ?? FeaturesServiceCachingProxy.DEFAULT_TTL
    );
  }

  private async withCache<T>(cacheKey: string, fetchFn: () => Promise<T>, ttl: number): Promise<T> {
    // Try cache first
    try {
      const cachedResult = await this.redisService.get<T>(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
    } catch (cacheError) {
      captureException(cacheError);
    }

    try {
      const result = await fetchFn();

      // Cache the successful result
      this.cacheResult(cacheKey, result, ttl);

      return result;
    } catch (error) {
      // Optionally cache error states to prevent thundering herd
      if (this.cacheConfig.enableErrorCaching) {
        const errorTtl = this.cacheConfig.errorTtl ?? FeaturesServiceCachingProxy.CACHE_ERROR_TTL;
        this.cacheError(cacheKey, error, errorTtl);
      }

      captureException(error);
      throw error;
    }
  }

  /**
   * Cache successful results
   */
  private async cacheResult<T>(cacheKey: string, result: T, ttl: number): Promise<void> {
    try {
      await this.redisService.set(cacheKey, result, { ttl });
    } catch (cacheError) {
      // Log but don't fail on cache write errors
      captureException(cacheError);
    }
  }

  /**
   * Cache error states to prevent repeated failures
   */
  private async cacheError(cacheKey: string, error: unknown, ttl: number): Promise<void> {
    try {
      const errorCacheKey = `${cacheKey}:error`;
      const errorInfo = {
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
      await this.redisService.set(errorCacheKey, errorInfo, { ttl });
    } catch (cacheError) {
      // Log but don't fail on error cache write
      captureException(cacheError);
    }
  }

  /**
   * Build cache key with optional prefix
   */
  private buildCacheKey(baseKey: string): string {
    return this.cacheConfig.keyPrefix ? `${this.cacheConfig.keyPrefix}:${baseKey}` : baseKey;
  }

  /**
   * Invalidate cache entries for a specific pattern
   * Useful for cache invalidation strategies
   */
  async invalidateCache(pattern: "global" | "user" | "team", id?: number): Promise<void> {
    try {
      let keyPattern: string;

      switch (pattern) {
        case "global":
          keyPattern = this.buildCacheKey("feature:global:*");
          break;
        case "user":
          if (id === undefined) throw new Error("User ID required for user cache invalidation");
          keyPattern = this.buildCacheKey(`feature:user:${id}:*`);
          break;
        case "team":
          if (id === undefined) throw new Error("Team ID required for team cache invalidation");
          keyPattern = this.buildCacheKey(`feature:team:${id}:*`);
          break;
        default:
          throw new Error(`Unknown invalidation pattern: ${pattern}`);
      }
    } catch (error) {
      captureException(error);
      throw error;
    }
  }
}
