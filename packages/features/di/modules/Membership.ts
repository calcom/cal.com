import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyMembershipRepository } from "@calcom/features/membership/repositories/KyselyMembershipRepository";

import { type Container, createModule } from "../di";
import { moduleLoader as kyselyModuleLoader } from "./Kysely";

export const membershipRepositoryModule = createModule();
const token = DI_TOKENS.MEMBERSHIP_REPOSITORY;
const moduleToken = DI_TOKENS.MEMBERSHIP_REPOSITORY_MODULE;

// Kysely implementation uses read/write database instances for read replica support
membershipRepositoryModule
  .bind(token)
  .toClass(KyselyMembershipRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load membership repository module
    container.load(moduleToken, membershipRepositoryModule);
  },
};
