import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyFeaturesRepository } from "@calcom/features/flags/KyselyFeaturesRepository";

import { type Container, createModule } from "../di";
import { moduleLoader as kyselyModuleLoader } from "./Kysely";

export const featuresRepositoryModule = createModule();
const token = DI_TOKENS.FEATURES_REPOSITORY;
const moduleToken = DI_TOKENS.FEATURES_REPOSITORY_MODULE;

// Kysely implementation uses read/write database instances for read replica support
featuresRepositoryModule
  .bind(token)
  .toClass(KyselyFeaturesRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load features repository module
    container.load(moduleToken, featuresRepositoryModule);
  },
};
