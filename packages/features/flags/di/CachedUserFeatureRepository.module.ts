import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";

import { CachedUserFeatureRepository } from "../repositories/CachedUserFeatureRepository";
import { moduleLoader as prismaUserFeatureRepositoryModuleLoader } from "./PrismaUserFeatureRepository.module";
import { moduleLoader as redisUserFeatureRepositoryModuleLoader } from "./RedisUserFeatureRepository.module";
import { FLAGS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = FLAGS_DI_TOKENS.CACHED_USER_FEATURE_REPOSITORY;
const moduleToken = FLAGS_DI_TOKENS.CACHED_USER_FEATURE_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CachedUserFeatureRepository,
  depsMap: {
    prismaRepo: prismaUserFeatureRepositoryModuleLoader,
    redisRepo: redisUserFeatureRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { CachedUserFeatureRepository };
