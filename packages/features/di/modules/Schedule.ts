import { type Container, createModule } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyScheduleRepository } from "@calcom/features/schedules/repositories/KyselyScheduleRepository";

import { moduleLoader as kyselyModuleLoader } from "./Kysely";

const token = DI_TOKENS.SCHEDULE_REPOSITORY;
const moduleToken = DI_TOKENS.SCHEDULE_REPOSITORY_MODULE;

// Schedule repository module - uses Kysely for all database operations
export const scheduleRepositoryModule = createModule();

// Kysely implementation uses read/write database instances for read replica support
scheduleRepositoryModule
  .bind(token)
  .toClass(KyselyScheduleRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

export const scheduleRepositoryModuleLoader = {
  token,
  loadModule: (container: Container) => {
    // Load Kysely module first (dependency)
    kyselyModuleLoader.loadModule(container);
    // Then load schedule repository module
    container.load(moduleToken, scheduleRepositoryModule);
  },
};
