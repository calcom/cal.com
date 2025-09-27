export interface CacheConfig {
  defaultTtl?: number;
  errorTtl?: number;
  enableErrorCaching?: boolean;
  keyPrefix?: string;
  batchSize?: number;
}

export interface ICacheService {
  /**
   * Execute a function with caching support
   * @param key The cache key
   * @param fetchFn The function to execute if cache misses
   * @param ttl Optional TTL override in milliseconds
   */
  withCache<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T>;

  /**
   * Invalidate all cache entries matching a pattern
   * @param pattern The pattern to match (supports wildcards)
   */
  invalidatePattern(pattern: string): Promise<void>;

  /**
   * Build a cache key with optional prefix
   * @param baseKey The base cache key
   */
  buildKey(baseKey: string): string;
}
