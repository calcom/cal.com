import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyTravelScheduleRepository } from "@calcom/lib/server/repository/KyselyTravelScheduleRepository";

import { type Container, createModule } from "../di";
import { moduleLoader as kyselyModuleLoader } from "./Kysely";

export const travelScheduleRepositoryModule = createModule();
const token = DI_TOKENS.TRAVEL_SCHEDULE_REPOSITORY;
const moduleToken = DI_TOKENS.TRAVEL_SCHEDULE_REPOSITORY_MODULE;

// Kysely implementation uses read/write database instances for read replica support
travelScheduleRepositoryModule
  .bind(token)
  .toClass(KyselyTravelScheduleRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load travel schedule repository module
    container.load(moduleToken, travelScheduleRepositoryModule);
  },
};
