import { DI_TOKENS } from "@calcom/features/di/tokens";
import { ScheduleRepository } from "@calcom/features/schedules/repositories/ScheduleRepository";

import { type Container, createModule, type ModuleLoader } from "../di";

export const scheduleRepositoryModule = createModule();
const token = DI_TOKENS.SCHEDULE_REPOSITORY;
const moduleToken = DI_TOKENS.SCHEDULE_REPOSITORY_MODULE;
scheduleRepositoryModule.bind(token).toClass(ScheduleRepository, [DI_TOKENS.PRISMA_CLIENT]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    container.load(moduleToken, scheduleRepositoryModule);
  },
} satisfies ModuleLoader;
