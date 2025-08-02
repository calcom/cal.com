import { RedisService } from "@calcom/features/redis/RedisService";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["CacheClient"] });

export interface ICacheClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export class EdgeCacheClient implements ICacheClient {
  private cachePrefix: string;

  constructor(cachePrefix = "googleapis") {
    this.cachePrefix = cachePrefix;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const { unstable_cache } = await import("next/cache");
      const cachedFn = unstable_cache(async () => null as T | null, [this.cachePrefix, key], {
        revalidate: 30,
        tags: [`${this.cachePrefix}:${key}`],
      });
      return await cachedFn();
    } catch (error) {
      log.warn("Edge cache get failed", safeStringify({ key, error }));
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 30): Promise<void> {
    try {
      const { unstable_cache } = await import("next/cache");
      const cachedFn = unstable_cache(async () => value, [this.cachePrefix, key], {
        revalidate: ttlSeconds,
        tags: [`${this.cachePrefix}:${key}`],
      });
      await cachedFn();
    } catch (error) {
      log.warn("Edge cache set failed", safeStringify({ key, error }));
    }
  }

  async del(key: string): Promise<void> {
    try {
      const { revalidateTag } = await import("next/cache");
      revalidateTag(`${this.cachePrefix}:${key}`);
    } catch (error) {
      log.warn("Edge cache del failed", safeStringify({ key, error }));
    }
  }
}

export class RedisCacheClient implements ICacheClient {
  private redis: RedisService;
  private cachePrefix: string;

  constructor(cachePrefix = "googleapis") {
    this.redis = new RedisService();
    this.cachePrefix = cachePrefix;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.redis.get<T>(`${this.cachePrefix}:${key}`);
  }

  async set<T>(key: string, value: T, ttlSeconds = 30): Promise<void> {
    const fullKey = `${this.cachePrefix}:${key}`;
    await this.redis.set(fullKey, value);
    await this.redis.expire(fullKey, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(`${this.cachePrefix}:${key}`);
  }
}

export class NoOpCacheClient implements ICacheClient {
  async get<T>(): Promise<T | null> {
    return null;
  }

  async set<T>(): Promise<void> {
    return;
  }

  async del(): Promise<void> {
    return;
  }
}
