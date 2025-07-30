import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";

import type { CacheService } from "../../../features/calendar-cache/lib/getShouldServeCache";
import { cacheModule } from "../modules/cache";
import { featuresModule } from "../modules/features";

const container = createContainer();
container.load(DI_TOKENS.FEATURES_REPOSITORY_MODULE, featuresModule);
container.load(DI_TOKENS.CACHE_SERVICE_MODULE, cacheModule);

export function getCacheService() {
  return container.get<CacheService>(DI_TOKENS.CACHE_SERVICE);
}
