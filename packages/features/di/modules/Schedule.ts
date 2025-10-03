import { DI_TOKENS } from "@calcom/features/di/tokens";
import { ScheduleRepository } from "@calcom/lib/server/repository/schedule";

import { createModule } from "../di";

export const scheduleRepositoryModule = createModule();
scheduleRepositoryModule
  .bind(DI_TOKENS.SCHEDULE_REPOSITORY)
  .toClass(ScheduleRepository, [DI_TOKENS.PRISMA_CLIENT]); // Maps 'prismaClient' param to PRISMA_CLIENT token
