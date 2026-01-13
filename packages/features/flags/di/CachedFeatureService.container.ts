import { createContainer } from "@calcom/features/di/di";

import {
  type CachedFeatureService,
  moduleLoader as cachedFeatureServiceModuleLoader,
} from "./CachedFeatureService.module";

const cachedFeatureServiceContainer = createContainer();

export function getCachedFeatureService(): CachedFeatureService {
  cachedFeatureServiceModuleLoader.loadModule(cachedFeatureServiceContainer);
  return cachedFeatureServiceContainer.get<CachedFeatureService>(cachedFeatureServiceModuleLoader.token);
}
