import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";

import { CachedTeamFeatureRepository } from "../repositories/CachedTeamFeatureRepository";
import { moduleLoader as prismaTeamFeatureRepositoryModuleLoader } from "./PrismaTeamFeatureRepository.module";
import { moduleLoader as redisTeamFeatureRepositoryModuleLoader } from "./RedisTeamFeatureRepository.module";
import { FLAGS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = FLAGS_DI_TOKENS.CACHED_TEAM_FEATURE_REPOSITORY;
const moduleToken = FLAGS_DI_TOKENS.CACHED_TEAM_FEATURE_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CachedTeamFeatureRepository,
  depsMap: {
    prismaRepo: prismaTeamFeatureRepositoryModuleLoader,
    redisRepo: redisTeamFeatureRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { CachedTeamFeatureRepository };
