import { KyselyCredentialRepository } from "@calcom/features/credentials/repositories/KyselyCredentialRepository";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import { type Container, createModule } from "../di";
import { moduleLoader as kyselyModuleLoader } from "./Kysely";

export const credentialRepositoryModule = createModule();
const token = DI_TOKENS.CREDENTIAL_REPOSITORY;
const moduleToken = DI_TOKENS.CREDENTIAL_REPOSITORY_MODULE;

// Kysely implementation uses read/write database instances for read replica support
credentialRepositoryModule
  .bind(token)
  .toClass(KyselyCredentialRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load credential repository module
    container.load(moduleToken, credentialRepositoryModule);
  },
};

