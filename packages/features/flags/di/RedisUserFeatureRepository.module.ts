import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as redisModuleLoader } from "@calcom/features/redis/di/redisModule";

import { RedisUserFeatureRepository } from "../repositories/RedisUserFeatureRepository";
import { FLAGS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = FLAGS_DI_TOKENS.REDIS_USER_FEATURE_REPOSITORY;
const moduleToken = FLAGS_DI_TOKENS.REDIS_USER_FEATURE_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: RedisUserFeatureRepository,
  dep: redisModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { RedisUserFeatureRepository };
