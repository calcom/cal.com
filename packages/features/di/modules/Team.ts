import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyTeamRepository } from "@calcom/features/ee/teams/repositories/KyselyTeamRepository";

import { type Container, createModule } from "../di";
import { moduleLoader as kyselyModuleLoader } from "./Kysely";

export const teamRepositoryModule = createModule();
const token = DI_TOKENS.TEAM_REPOSITORY;
const moduleToken = DI_TOKENS.TEAM_REPOSITORY_MODULE;

// Kysely implementation uses read/write database instances for read replica support
teamRepositoryModule
  .bind(token)
  .toClass(KyselyTeamRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load team repository module
    container.load(moduleToken, teamRepositoryModule);
  },
};
