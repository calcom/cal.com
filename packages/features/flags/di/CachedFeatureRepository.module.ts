import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";

import { CachedFeatureRepository } from "../repositories/CachedFeatureRepository";
import { moduleLoader as prismaFeatureRepositoryModuleLoader } from "./PrismaFeatureRepository.module";
import { moduleLoader as redisFeatureRepositoryModuleLoader } from "./RedisFeatureRepository.module";
import { FLAGS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = FLAGS_DI_TOKENS.CACHED_FEATURE_REPOSITORY;
const moduleToken = FLAGS_DI_TOKENS.CACHED_FEATURE_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CachedFeatureRepository,
  depsMap: {
    prismaRepo: prismaFeatureRepositoryModuleLoader,
    redisRepo: redisFeatureRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { CachedFeatureRepository };
