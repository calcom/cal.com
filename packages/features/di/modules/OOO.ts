import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyOOORepository } from "@calcom/lib/server/repository/KyselyOOORepository";

import { type Container, createModule } from "../di";
import { moduleLoader as kyselyModuleLoader } from "./Kysely";

export const oooRepositoryModule = createModule();
const token = DI_TOKENS.OOO_REPOSITORY;
const moduleToken = DI_TOKENS.OOO_REPOSITORY_MODULE;

// Kysely implementation uses read/write database instances for read replica support
oooRepositoryModule
  .bind(token)
  .toClass(KyselyOOORepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load OOO repository module
    container.load(moduleToken, oooRepositoryModule);
  },
};
