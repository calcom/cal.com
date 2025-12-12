import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyOAuthClientRepository } from "@calcom/features/oauth/repositories/KyselyOAuthClientRepository";

import { type Container, createModule } from "../di";
import { moduleLoader as kyselyModuleLoader } from "./Kysely";

export const oauthClientRepositoryModule = createModule();
const token = DI_TOKENS.OAUTH_CLIENT_REPOSITORY;
const moduleToken = DI_TOKENS.OAUTH_CLIENT_REPOSITORY_MODULE;

// Kysely implementation uses read/write database instances for read replica support
oauthClientRepositoryModule
  .bind(token)
  .toClass(KyselyOAuthClientRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load OAuth client repository module
    container.load(moduleToken, oauthClientRepositoryModule);
  },
};
