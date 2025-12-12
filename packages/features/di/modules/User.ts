import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyUserRepository } from "@calcom/features/users/repositories/KyselyUserRepository";

import { type Container, createModule } from "../di";
import { moduleLoader as kyselyModuleLoader } from "./Kysely";

export const userRepositoryModule = createModule();
const token = DI_TOKENS.USER_REPOSITORY;
const moduleToken = DI_TOKENS.USER_REPOSITORY_MODULE;

// Kysely implementation uses read/write database instances for read replica support
userRepositoryModule
  .bind(token)
  .toClass(KyselyUserRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load user repository module
    container.load(moduleToken, userRepositoryModule);
  },
};
