import { EdgeCacheClient, RedisCacheClient, type ICacheClient } from "./CacheClient";
import { CachedFetchManager } from "./cachedFetch";

export class GoogleApiCacheFactory {
  static createEdgeCacheManager(): CachedFetchManager {
    const cacheClient = new EdgeCacheClient();
    return new CachedFetchManager(cacheClient);
  }

  static createRedisCacheManager(): CachedFetchManager {
    const cacheClient = new RedisCacheClient();
    return new CachedFetchManager(cacheClient);
  }

  static createCacheManager(cacheClient: ICacheClient): CachedFetchManager {
    return new CachedFetchManager(cacheClient);
  }
}
