import { Injectable } from "@nestjs/common";

import { GoogleApiCacheFactory } from "@calcom/app-store/_utils/googleapis/GoogleApiCacheFactory";
import { CachedFetchManager } from "@calcom/app-store/_utils/googleapis/cachedFetch";

@Injectable()
export class GoogleApiCacheService {
  private cacheManager: CachedFetchManager;

  constructor() {
    this.cacheManager = GoogleApiCacheFactory.createRedisCacheManager();
  }

  getCacheManager(): CachedFetchManager {
    return this.cacheManager;
  }
}
