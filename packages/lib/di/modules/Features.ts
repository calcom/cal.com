import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { createModule } from "@evyweb/ioctopus";

export const featuresRepositoryModule = createModule();
featuresRepositoryModule
  .bind(DI_TOKENS.FEATURES_REPOSITORY)
  .toClass(FeaturesRepository, [DI_TOKENS.PRISMA_CLIENT]);
