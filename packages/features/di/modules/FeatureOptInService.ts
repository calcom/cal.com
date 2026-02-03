import { FEATURE_OPT_IN_DI_TOKENS } from "@calcom/features/feature-opt-in/di/tokens";
import { FeatureOptInService } from "@calcom/features/feature-opt-in/services/FeatureOptInService";
import { moduleLoader as cachedFeatureRepositoryModuleLoader } from "@calcom/features/flags/di/CachedFeatureRepository.module";
import { moduleLoader as cachedTeamFeatureRepositoryModuleLoader } from "@calcom/features/flags/di/CachedTeamFeatureRepository.module";
import { moduleLoader as cachedUserFeatureRepositoryModuleLoader } from "@calcom/features/flags/di/CachedUserFeatureRepository.module";
import type { Module } from "@evyweb/ioctopus";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "../di";

const thisModule: Module = createModule();
const token: symbol = FEATURE_OPT_IN_DI_TOKENS.FEATURE_OPT_IN_SERVICE;
const moduleToken: symbol = FEATURE_OPT_IN_DI_TOKENS.FEATURE_OPT_IN_SERVICE_MODULE;

const loadModule: ReturnType<typeof bindModuleToClassOnToken> = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: FeatureOptInService,
  depsMap: {
    featureRepo: cachedFeatureRepositoryModuleLoader,
    teamFeatureRepo: cachedTeamFeatureRepositoryModuleLoader,
    userFeatureRepo: cachedUserFeatureRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { FeatureOptInService };
