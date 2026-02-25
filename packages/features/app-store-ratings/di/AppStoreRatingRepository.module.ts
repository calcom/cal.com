import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { AppStoreRatingRepository } from "../repository/AppStoreRatingRepository";

const thisModule = createModule();
const token = DI_TOKENS.APP_STORE_RATING_REPOSITORY;
const moduleToken = DI_TOKENS.APP_STORE_RATING_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AppStoreRatingRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AppStoreRatingRepository };
