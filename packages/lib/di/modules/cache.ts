import { createModule } from "@evyweb/ioctopus";

import { CacheService } from "@calcom/features/calendar-cache/lib/getShouldServeCache";
import { getFeaturesRepository } from "@calcom/lib/di/containers/features";

import { DI_TOKENS } from "../tokens";

export const cacheModule = createModule();
cacheModule.bind(DI_TOKENS.CACHE_SERVICE).toFactory(() => {
  return new CacheService({
    featuresRepository: getFeaturesRepository(),
  });
});
