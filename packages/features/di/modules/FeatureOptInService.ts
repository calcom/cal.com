import { FEATURE_OPT_IN_DI_TOKENS } from "@calcom/features/feature-opt-in/di/tokens";
import { FeatureOptInService } from "@calcom/features/feature-opt-in/services/FeatureOptInService";

import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "../di";
import { moduleLoader as featuresRepositoryModuleLoader } from "./FeaturesRepository";

const thisModule = createModule();
const token = FEATURE_OPT_IN_DI_TOKENS.FEATURE_OPT_IN_SERVICE;
const moduleToken = FEATURE_OPT_IN_DI_TOKENS.FEATURE_OPT_IN_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: FeatureOptInService,
  dep: featuresRepositoryModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { FeatureOptInService };
