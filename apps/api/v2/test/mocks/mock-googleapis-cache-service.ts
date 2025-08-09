import type { CachedFetchManager } from "@calcom/app-store/_utils/googleapis";
import { GoogleApiCacheFactory } from "@calcom/app-store/_utils/googleapis";

export class MockGoogleApiCacheService {
  private cacheManager: CachedFetchManager;

  constructor() {
    this.cacheManager = GoogleApiCacheFactory.createCacheManager({
      async get() {
        return null;
      },
      async set() {
        return;
      },
      async del() {
        return;
      },
    });
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
