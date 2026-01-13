import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";

import { FeatureService } from "../services/FeatureService";
import { moduleLoader as prismaUserFeatureRepositoryModuleLoader } from "./PrismaUserFeatureRepository.module";
import { FLAGS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = FLAGS_DI_TOKENS.FEATURE_SERVICE;
const moduleToken = FLAGS_DI_TOKENS.FEATURE_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: FeatureService,
  depsMap: {
    prismaUserFeatureRepo: prismaUserFeatureRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { FeatureService };
