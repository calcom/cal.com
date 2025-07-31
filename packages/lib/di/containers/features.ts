import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";

import type { FeaturesRepository } from "../../../features/flags/features.repository";
import { featuresModule } from "../modules/features";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.FEATURES_REPOSITORY_MODULE, featuresModule);

export function getFeaturesRepository() {
  return container.get<FeaturesRepository>(DI_TOKENS.FEATURES_REPOSITORY);
}
