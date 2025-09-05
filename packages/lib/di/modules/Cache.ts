import type { ICacheService } from "@calcom/features/calendar-cache/lib/getShouldServeCache";
import { CacheService } from "@calcom/features/calendar-cache/lib/getShouldServeCache";
import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "../tokens";

export const cacheModule = createModule();
cacheModule.bind(DI_TOKENS.CACHE_SERVICE).toClass(CacheService, {
  featuresRepository: DI_TOKENS.FEATURES_REPOSITORY,
} satisfies Record<keyof ICacheService, symbol>);
