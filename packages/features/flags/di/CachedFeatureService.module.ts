import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";

import { CachedFeatureService } from "../services/CachedFeatureService";
import { moduleLoader as prismaUserFeatureRepositoryModuleLoader } from "./PrismaUserFeatureRepository.module";
import { moduleLoader as redisUserFeatureRepositoryModuleLoader } from "./RedisUserFeatureRepository.module";
import { FLAGS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = FLAGS_DI_TOKENS.CACHED_FEATURE_SERVICE;
const moduleToken = FLAGS_DI_TOKENS.CACHED_FEATURE_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CachedFeatureService,
  depsMap: {
    prismaUserFeatureRepo: prismaUserFeatureRepositoryModuleLoader,
    redisUserFeatureRepo: redisUserFeatureRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { CachedFeatureService };
