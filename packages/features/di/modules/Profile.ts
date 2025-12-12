import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyProfileRepository } from "@calcom/features/profile/repositories/KyselyProfileRepository";

import { type Container, createModule } from "../di";
import { moduleLoader as kyselyModuleLoader } from "./Kysely";

export const profileRepositoryModule = createModule();
const token = DI_TOKENS.PROFILE_REPOSITORY;
const moduleToken = DI_TOKENS.PROFILE_REPOSITORY_MODULE;

// Kysely implementation uses read/write database instances for read replica support
profileRepositoryModule
  .bind(token)
  .toClass(KyselyProfileRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load profile repository module
    container.load(moduleToken, profileRepositoryModule);
  },
};
