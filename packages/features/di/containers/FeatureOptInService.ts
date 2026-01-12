import { prismaModule } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import type { FeatureOptInServiceInterface } from "@calcom/features/feature-opt-in/services/FeatureOptInServiceInterface";

import { createContainer } from "../di";
import { featureOptInServiceModule } from "../modules/FeatureOptInService";
import { featuresRepositoryModule } from "../modules/FeaturesRepository";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.FEATURES_REPOSITORY_MODULE, featuresRepositoryModule);
container.load(DI_TOKENS.FEATURE_OPT_IN_SERVICE_MODULE, featureOptInServiceModule);

export function getFeatureOptInService() {
  return container.get<FeatureOptInServiceInterface>(DI_TOKENS.FEATURE_OPT_IN_SERVICE);
}
