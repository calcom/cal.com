import { createContainer } from "@calcom/features/di/di";

import {
  type AppStoreRatingService,
  moduleLoader as appStoreRatingServiceModuleLoader,
} from "./AppStoreRatingService.module";

const appStoreRatingServiceContainer = createContainer();

export function getAppStoreRatingService(): AppStoreRatingService {
  appStoreRatingServiceModuleLoader.loadModule(appStoreRatingServiceContainer);
  return appStoreRatingServiceContainer.get<AppStoreRatingService>(appStoreRatingServiceModuleLoader.token);
}
