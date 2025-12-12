import { type Container, createModule } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselySelectedCalendarRepository } from "@calcom/lib/server/repository/KyselySelectedCalendarRepository";

import { moduleLoader as kyselyModuleLoader } from "./Kysely";

const token = DI_TOKENS.SELECTED_CALENDAR_REPOSITORY;
const moduleToken = DI_TOKENS.SELECTED_CALENDAR_REPOSITORY_MODULE;

// SelectedCalendar repository module - uses Kysely for all database operations
export const selectedCalendarRepositoryModule = createModule();

// Kysely implementation uses read/write database instances for read replica support
selectedCalendarRepositoryModule
  .bind(token)
  .toClass(KyselySelectedCalendarRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const selectedCalendarRepositoryModuleLoader = {
  token,
  loadModule: (container: Container) => {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load selected calendar repository module
    container.load(moduleToken, selectedCalendarRepositoryModule);
  },
};
