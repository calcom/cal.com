import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyScheduleRepository } from "@calcom/features/schedules/repositories/KyselyScheduleRepository";
import { ScheduleRepository } from "@calcom/features/schedules/repositories/ScheduleRepository";

import { createModule } from "../di";

// Feature flag to switch between Prisma and Kysely implementations
// Set to true to use Kysely, false to use Prisma (default)
const USE_KYSELY_SCHEDULE_REPOSITORY = process.env.USE_KYSELY_SCHEDULE_REPOSITORY === "true";

export const scheduleRepositoryModule = createModule();

if (USE_KYSELY_SCHEDULE_REPOSITORY) {
  // Kysely implementation uses read/write database instances
  scheduleRepositoryModule
    .bind(DI_TOKENS.SCHEDULE_REPOSITORY)
    .toClass(KyselyScheduleRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);
} else {
  // Prisma implementation (default)
  scheduleRepositoryModule
    .bind(DI_TOKENS.SCHEDULE_REPOSITORY)
    .toClass(ScheduleRepository, [DI_TOKENS.PRISMA_CLIENT]);
}
