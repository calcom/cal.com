import { FLAGS_DI_TOKENS } from "@calcom/features/flags/di/tokens";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";

import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "../di";
import { moduleLoader as prismaModuleLoader } from "./Prisma";

export const featuresRepositoryModule = createModule();
const token = FLAGS_DI_TOKENS.FEATURES_REPOSITORY;
const moduleToken = FLAGS_DI_TOKENS.FEATURES_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: featuresRepositoryModule,
  moduleToken,
  token,
  classs: FeaturesRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { FeaturesRepository };
