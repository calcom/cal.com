import type { IFeatureOptInService } from "@calcom/features/feature-opt-in/services/IFeatureOptInService";

import { createContainer } from "../di";
import { moduleLoader as featureOptInServiceModuleLoader } from "../modules/FeatureOptInService";

const featureOptInServiceContainer = createContainer();

export function getFeatureOptInService(): IFeatureOptInService {
  featureOptInServiceModuleLoader.loadModule(featureOptInServiceContainer);
  return featureOptInServiceContainer.get<IFeatureOptInService>(featureOptInServiceModuleLoader.token);
}
