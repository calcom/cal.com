import { FLAGS_DI_TOKENS } from "@calcom/features/flags/di/tokens";
import { CachedFeaturesRepository } from "@calcom/features/flags/cached-features.repository";
import { moduleLoader as redisModuleLoader } from "@calcom/features/redis/di/redisModule";

import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "../di";
import { moduleLoader as featuresRepositoryModuleLoader } from "./FeaturesRepository";

const thisModule = createModule();
const token = FLAGS_DI_TOKENS.CACHED_FEATURES_REPOSITORY;
const moduleToken = FLAGS_DI_TOKENS.CACHED_FEATURES_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CachedFeaturesRepository,
  depsMap: {
    featuresRepository: featuresRepositoryModuleLoader,
    redisService: redisModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { CachedFeaturesRepository };
