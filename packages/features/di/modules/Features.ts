import { DI_TOKENS } from "@calcom/features/di/tokens";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";

import { type Container, createModule } from "../di";

export const featuresRepositoryModule = createModule();
const token = DI_TOKENS.FEATURES_REPOSITORY;
const moduleToken = DI_TOKENS.FEATURES_REPOSITORY_MODULE;
featuresRepositoryModule.bind(token).toClass(FeaturesRepository, [DI_TOKENS.PRISMA_CLIENT]);

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, featuresRepositoryModule);
  },
};
