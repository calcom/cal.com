import { captureException } from "@sentry/nextjs";

import type { IRedisService } from "./IRedisService";

export interface CacheConfig {
  defaultTtl?: number;
  errorTtl?: number;
  enableErrorCaching?: boolean;
  keyPrefix?: string;
  batchSize?: number;
}

export abstract class BaseCacheProxy {
  protected static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  protected static readonly CACHE_ERROR_TTL = 60 * 1000; // 1 minute for error states
  protected static readonly BATCH_SIZE = 10;

  constructor(
    protected readonly redisService: IRedisService,
    protected readonly cacheConfig: CacheConfig = {}
  ) {}

  protected async withCache<T>(cacheKey: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    const finalTtl = ttl ?? this.cacheConfig.defaultTtl ?? BaseCacheProxy.DEFAULT_TTL;

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
      await this.cacheResult(cacheKey, result, finalTtl);

      return result;
    } catch (error) {
      // Optionally cache error states to prevent thundering herd
      if (this.cacheConfig.enableErrorCaching) {
        const errorTtl = this.cacheConfig.errorTtl ?? BaseCacheProxy.CACHE_ERROR_TTL;
        await this.cacheError(cacheKey, error, errorTtl);
      }

      captureException(error);
      throw error;
    }
  }

  protected async cacheResult<T>(cacheKey: string, result: T, ttl: number): Promise<void> {
    try {
      await this.redisService.set(cacheKey, result, { ttl });
    } catch (cacheError) {
      // Log but don't fail on cache write errors
      captureException(cacheError);
    }
  }

  protected async cacheError(cacheKey: string, error: unknown, ttl: number): Promise<void> {
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

  protected buildCacheKey(baseKey: string): string {
    return this.cacheConfig.keyPrefix ? `${this.cacheConfig.keyPrefix}:${baseKey}` : baseKey;
  }

  public async invalidateCachePattern(keyPattern: string): Promise<void> {
    try {
      const pattern = this.buildCacheKey(keyPattern);

      // Use SCAN to find all matching keys without blocking
      const matchingKeys: string[] = [];
      let cursor = "0";

      do {
        const [nextCursor, keys] = await this.redisService.scan(cursor, {
          match: pattern,
          count: this.cacheConfig.batchSize ?? BaseCacheProxy.BATCH_SIZE,
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
}
