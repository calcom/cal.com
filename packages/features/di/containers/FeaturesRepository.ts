import { prismaModule } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";

import { createContainer } from "../di";
import { featuresRepositoryModule } from "../modules/FeaturesRepository";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.FEATURES_REPOSITORY_MODULE, featuresRepositoryModule);

export function getFeaturesRepository() {
  return container.get<FeaturesRepository>(DI_TOKENS.FEATURES_REPOSITORY);
}
