import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import { type ICacheClient, NoOpCacheClient } from "./CacheClient";
import { GoogleApiCache, type CacheConfig } from "./GoogleApiCache";

const log = logger.getSubLogger({ prefix: ["cachedFetch"] });

export class CachedFetchManager {
  private cacheClient: ICacheClient;
  private googleApiCache: Map<number, GoogleApiCache> = new Map();

  constructor(cacheClient?: ICacheClient) {
    this.cacheClient = cacheClient || new NoOpCacheClient();
  }

  private getGoogleApiCache(credentialId: number): GoogleApiCache {
    if (!this.googleApiCache.has(credentialId)) {
      this.googleApiCache.set(credentialId, new GoogleApiCache(credentialId));
    }
    return this.googleApiCache.get(credentialId)!;
  }

  async cachedFetch<T>(
    credentialId: number,
    method: string,
    params: any,
    originalFetch: () => Promise<T>
  ): Promise<T> {
    const isReadOperation = method.includes(".list") || method.includes(".get") || method.includes(".query");

    if (!isReadOperation) {
      log.debug("Skipping cache for write operation", safeStringify({ method }));
      return originalFetch();
    }

    const cache = this.getGoogleApiCache(credentialId);
    return cache.dedupe(method, params, originalFetch);
  }

  getCacheStats(credentialId: number): { size: number; credentialId: number; config: CacheConfig } | null {
    const cache = this.googleApiCache.get(credentialId);
    return cache?.getCacheStats() || null;
  }

  clearCache(credentialId: number) {
    this.googleApiCache.delete(credentialId);
  }
}

export async function cachedFetch<T>(
  credentialId: number,
  method: string,
  params: any,
  originalFetch: () => Promise<T>,
  cacheManager?: CachedFetchManager
): Promise<T> {
  if (!cacheManager) {
    return originalFetch();
  }
  return cacheManager.cachedFetch(credentialId, method, params, originalFetch);
}
