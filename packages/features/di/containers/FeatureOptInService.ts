import type { FeatureOptInServiceInterface } from "@calcom/features/feature-opt-in/services/FeatureOptInServiceInterface";

import { createContainer } from "../di";
import { moduleLoader as featureOptInServiceModuleLoader } from "../modules/FeatureOptInService";

const featureOptInServiceContainer = createContainer();

export function getFeatureOptInService(): FeatureOptInServiceInterface {
  featureOptInServiceModuleLoader.loadModule(featureOptInServiceContainer);
  return featureOptInServiceContainer.get<FeatureOptInServiceInterface>(featureOptInServiceModuleLoader.token);
}
