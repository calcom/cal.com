import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyHostRepository } from "@calcom/lib/server/repository/KyselyHostRepository";

import { type Container, createModule } from "../di";
import { moduleLoader as kyselyModuleLoader } from "./Kysely";

export const hostRepositoryModule = createModule();
const token = DI_TOKENS.HOST_REPOSITORY;
const moduleToken = DI_TOKENS.HOST_REPOSITORY_MODULE;

// Kysely implementation uses read/write database instances for read replica support
hostRepositoryModule
  .bind(token)
  .toClass(KyselyHostRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load host repository module
    container.load(moduleToken, hostRepositoryModule);
  },
};
