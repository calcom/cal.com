import { createContainer } from "@calcom/features/di/di";

import { type FeatureService, moduleLoader as featureServiceModuleLoader } from "./FeatureService.module";

const featureServiceContainer = createContainer();

export function getFeatureService(): FeatureService {
  featureServiceModuleLoader.loadModule(featureServiceContainer);
  return featureServiceContainer.get<FeatureService>(featureServiceModuleLoader.token);
}
