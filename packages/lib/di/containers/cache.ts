import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";

import type { CacheService } from "../../../features/calendar-cache/lib/getShouldServeCache";
import { cacheModule } from "../modules/cache";
import { featuresRepositoryModule } from "../modules/features";

const container = createContainer();
container.load(DI_TOKENS.CACHE_SERVICE_MODULE, cacheModule);
container.load(DI_TOKENS.FEATURES_REPOSITORY_MODULE, featuresRepositoryModule);

export function getCacheService() {
  return container.get<CacheService>(DI_TOKENS.CACHE_SERVICE);
}
