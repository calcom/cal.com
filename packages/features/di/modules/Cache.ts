import { CacheService } from "@calcom/features/calendar-cache/lib/getShouldServeCache";

import { createModule, bindModuleToClassOnToken, type ModuleLoader } from "../di";
import { DI_TOKENS } from "../tokens";
import { moduleLoader as featuresRepositoryModuleLoader } from "./Features";

export const cacheModule = createModule();
const token = DI_TOKENS.CACHE_SERVICE;
const moduleToken = DI_TOKENS.CACHE_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: cacheModule,
  moduleToken,
  token,
  classs: CacheService,
  depsMap: {
    featuresRepository: featuresRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
