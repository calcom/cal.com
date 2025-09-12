import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";

import type { CacheService } from "../../../features/calendar-cache/lib/getShouldServeCache";
import { createContainer } from "../di";
import { cacheModule } from "../modules/Cache";
import { featuresRepositoryModule } from "../modules/Features";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.FEATURES_REPOSITORY_MODULE, featuresRepositoryModule);
container.load(DI_TOKENS.CACHE_SERVICE_MODULE, cacheModule);

export function getCacheService() {
  return container.get<CacheService>(DI_TOKENS.CACHE_SERVICE);
}
