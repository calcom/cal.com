import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as redisModuleLoader } from "@calcom/features/di/modules/Redis";

import { RedisFeatureRepository } from "../repositories/RedisFeatureRepository";
import { FLAGS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = FLAGS_DI_TOKENS.REDIS_FEATURE_REPOSITORY;
const moduleToken = FLAGS_DI_TOKENS.REDIS_FEATURE_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: RedisFeatureRepository,
  dep: redisModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { RedisFeatureRepository };
