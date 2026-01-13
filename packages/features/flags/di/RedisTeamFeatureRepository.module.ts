import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as redisModuleLoader } from "@calcom/features/redis/di/Redis.module";

import { RedisTeamFeatureRepository } from "../repositories/RedisTeamFeatureRepository";
import { FLAGS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = FLAGS_DI_TOKENS.REDIS_TEAM_FEATURE_REPOSITORY;
const moduleToken = FLAGS_DI_TOKENS.REDIS_TEAM_FEATURE_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: RedisTeamFeatureRepository,
  dep: redisModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { RedisTeamFeatureRepository };
