import { createModule } from "@evyweb/ioctopus";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { DI_TOKENS } from "@calcom/lib/di/tokens";

export const featuresRepositoryModule = createModule();
featuresRepositoryModule
  .bind(DI_TOKENS.FEATURES_REPOSITORY)
  .toClass(FeaturesRepository, [DI_TOKENS.PRISMA_CLIENT]);
