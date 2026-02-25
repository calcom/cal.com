import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import { AppStoreRatingService } from "../service/AppStoreRatingService";
import { moduleLoader as appStoreRatingRepositoryModuleLoader } from "./AppStoreRatingRepository.module";

const thisModule = createModule();
const token = DI_TOKENS.APP_STORE_RATING_SERVICE;
const moduleToken = DI_TOKENS.APP_STORE_RATING_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AppStoreRatingService,
  depsMap: {
    appStoreRatingRepository: appStoreRatingRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AppStoreRatingService };
