import { captureException } from "@sentry/nextjs";

import { RedisService } from "@calcom/features/redis/RedisService";

/**
 * Generic base class for creating caching proxy layers around repository interfaces.
 * Provides Redis caching with graceful fallback to the original repository.
 *
 * @template TRepository - The repository interface type to proxy
 * @template TImplementation - The concrete repository implementation type
 */
export abstract class BaseCacheProxy<TRepository, TImplementation extends TRepository> {
  protected redis: RedisService | null = null;
  protected readonly REDIS_KEY_VERSION: string;
  protected readonly CACHE_TTL = 300; // 5 minutes in seconds
  protected repository: TImplementation;

  constructor(repository: TImplementation, keyPrefix: string) {
    this.repository = repository;
    this.REDIS_KEY_VERSION = `V1.${keyPrefix}`;

    const UPSTASH_ENV_FOUND = process.env.UPSTASH_REDIS_REST_TOKEN && process.env.UPSTASH_REDIS_REST_URL;
    if (UPSTASH_ENV_FOUND) {
      try {
        this.redis = new RedisService();
      } catch (error) {
        console.warn("Failed to initialize Redis service:", error);
        this.redis = null;
      }
    }
  }

  /**
   * Generic caching wrapper for repository methods.
   * Implements cache-first strategy with graceful fallback.
   *
   * @param cacheKey - Redis cache key
   * @param repositoryMethod - Function that calls the original repository method
   * @param errorContext - Context string for error logging
   * @returns Promise with cached or fresh data
   */
  protected async withCache<TResult>(
    cacheKey: string,
    repositoryMethod: () => Promise<TResult>,
    errorContext: string
  ): Promise<TResult> {
    if (this.redis) {
      try {
        const cachedResult = await this.redis.get<TResult>(cacheKey);
        if (cachedResult !== null) {
          return cachedResult;
        }
      } catch (error) {
        console.warn(`Redis get failed for ${errorContext}, falling back to repository:`, error);
      }
    }

    try {
      const result = await repositoryMethod();

      if (this.redis) {
        try {
          await this.redis.set(cacheKey, result);
          await this.redis.expire(cacheKey, this.CACHE_TTL);
        } catch (error) {
          console.warn(`Redis set failed for ${errorContext}:`, error);
        }
      }

      return result;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Proxy method for non-cached repository methods.
   * Simply delegates to the original repository without caching.
   */
  protected async withoutCache<TResult>(repositoryMethod: () => Promise<TResult>): Promise<TResult> {
    return repositoryMethod();
  }

  /**
   * Generic cache invalidation method.
   */
  protected async invalidateKeys(keys: string[]): Promise<void> {
    if (!this.redis) return;

    try {
      for (const key of keys) {
        await this.redis.del(key);
      }
    } catch (error) {
      console.warn("Redis cache invalidation failed:", error);
    }
  }

  /**
   * Helper method to build cache keys with consistent formatting.
   */
  protected buildCacheKey(...parts: (string | number)[]): string {
    return `${this.REDIS_KEY_VERSION}.${parts.join(":")}`;
  }
}
