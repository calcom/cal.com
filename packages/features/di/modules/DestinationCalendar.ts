import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyDestinationCalendarRepository } from "@calcom/lib/server/repository/KyselyDestinationCalendarRepository";

import { type Container, createModule } from "../di";
import { moduleLoader as kyselyModuleLoader } from "./Kysely";

export const destinationCalendarRepositoryModule = createModule();
const token = DI_TOKENS.DESTINATION_CALENDAR_REPOSITORY;
const moduleToken = DI_TOKENS.DESTINATION_CALENDAR_REPOSITORY_MODULE;

// Kysely implementation uses read/write database instances for read replica support
destinationCalendarRepositoryModule
  .bind(token)
  .toClass(KyselyDestinationCalendarRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load destination calendar repository module
    container.load(moduleToken, destinationCalendarRepositoryModule);
  },
};
