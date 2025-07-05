import { Injectable } from "@nestjs/common";

import { GoogleApiCacheFactory, type CachedFetchManager } from "@calcom/app-store/_utils/googleapis";

@Injectable()
export class GoogleApiCacheService {
  private cacheManager: CachedFetchManager;

  constructor() {
    this.cacheManager = GoogleApiCacheFactory.createRedisCacheManager();
  }

  getCacheManager(): CachedFetchManager {
    return this.cacheManager;
  }

  getCacheStats(credentialId: number) {
    return this.cacheManager.getCacheStats(credentialId);
  }

  clearCache(credentialId: number) {
    this.cacheManager.clearCache(credentialId);
  }
}
