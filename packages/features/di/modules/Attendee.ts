import { DI_TOKENS } from "@calcom/features/di/tokens";
import { AttendeeRepository } from "@calcom/features/bookings/repositories/AttendeeRepository";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { createModule, bindModuleToClassOnToken, type ModuleLoader } from "../di";

export const attendeeRepositoryModule = createModule();
const token = DI_TOKENS.ATTENDEE_REPOSITORY;
const moduleToken = DI_TOKENS.ATTENDEE_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: attendeeRepositoryModule,
  moduleToken,
  token,
  classs: AttendeeRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
