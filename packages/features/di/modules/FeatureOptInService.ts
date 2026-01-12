import { FeatureOptInService } from "@calcom/features/feature-opt-in/services/FeatureOptInService";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import { createModule } from "../di";

export const featureOptInServiceModule = createModule();
featureOptInServiceModule
  .bind(DI_TOKENS.FEATURE_OPT_IN_SERVICE)
  .toClass(FeatureOptInService, [DI_TOKENS.FEATURES_REPOSITORY]);
