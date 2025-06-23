import { GoogleApiCacheService } from "@/modules/googleapis-cache/googleapis-cache.service";
import { Provider } from "@nestjs/common";

import { NoOpCacheClient } from "@calcom/app-store/_utils/googleapis/CacheClient";
import { CachedFetchManager } from "@calcom/app-store/_utils/googleapis/cachedFetch";

export const MockedGoogleApiCacheService = {
  provide: GoogleApiCacheService,
  useValue: {
    getCacheManager: jest.fn().mockReturnValue(new CachedFetchManager(new NoOpCacheClient())),
  },
} as Provider;
