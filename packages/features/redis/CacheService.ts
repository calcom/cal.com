import { captureException } from "@sentry/nextjs";

import type { CacheConfig, ICacheService } from "./ICacheService";
import type { IRedisService } from "./IRedisService";

export class CacheService implements ICacheService {
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  private static readonly CACHE_ERROR_TTL = 60 * 1000; // 1 minute for error states
  private static readonly BATCH_SIZE = 10;

  constructor(private readonly redisService: IRedisService, private readonly cacheConfig: CacheConfig = {}) {}

  async withCache<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    const finalTtl = ttl ?? this.cacheConfig.defaultTtl ?? CacheService.DEFAULT_TTL;

    // Try cache first
    try {
      const cachedResult = await this.redisService.get<T>(key);
      if (cachedResult !== null) {
        return cachedResult;
      }
    } catch (cacheError) {
      captureException(cacheError);
    }

    try {
      const result = await fetchFn();

      // Cache the successful result
      await this.cacheResult(key, result, finalTtl);

      return result;
    } catch (error) {
      // Optionally cache error states to prevent thundering herd
      if (this.cacheConfig.enableErrorCaching) {
        const errorTtl = this.cacheConfig.errorTtl ?? CacheService.CACHE_ERROR_TTL;
        await this.cacheError(key, error, errorTtl);
      }

      captureException(error);
      throw error;
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const fullPattern = this.buildKey(pattern);

      // Use SCAN to find all matching keys without blocking
      const matchingKeys: string[] = [];
      let cursor = "0";

      do {
        const [nextCursor, keys] = await this.redisService.scan(cursor, {
          match: fullPattern,
          count: this.cacheConfig.batchSize ?? CacheService.BATCH_SIZE,
        });

        matchingKeys.push(...keys);
        cursor = nextCursor;
      } while (cursor !== "0");

      // Delete all matching keys in batch
      if (matchingKeys.length > 0) {
        await this.redisService.deleteMany(matchingKeys);
      }
    } catch (error) {
      captureException(error);
      throw error;
    }
  }

  buildKey(baseKey: string): string {
    return this.cacheConfig.keyPrefix ? `${this.cacheConfig.keyPrefix}:${baseKey}` : baseKey;
  }

  private async cacheResult<T>(cacheKey: string, result: T, ttl: number): Promise<void> {
    try {
      await this.redisService.set(cacheKey, result, { ttl });
    } catch (cacheError) {
      // Log but don't fail on cache write errors
      captureException(cacheError);
    }
  }

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
}
