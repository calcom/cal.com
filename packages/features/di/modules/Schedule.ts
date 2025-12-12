import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyScheduleRepository } from "@calcom/features/schedules/repositories/KyselyScheduleRepository";

import { createModule } from "../di";

// Schedule repository module - uses Kysely for all database operations
export const scheduleRepositoryModule = createModule();

// Kysely implementation uses read/write database instances for read replica support
scheduleRepositoryModule
  .bind(DI_TOKENS.SCHEDULE_REPOSITORY)
  .toClass(KyselyScheduleRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);
