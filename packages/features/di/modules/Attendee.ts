import { AttendeeRepository } from "@calcom/features/bookings/repositories/AttendeeRepository";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import { type Container, createModule } from "../di";

export const attendeeRepositoryModule = createModule();
const token = DI_TOKENS.ATTENDEE_REPOSITORY;
const moduleToken = DI_TOKENS.ATTENDEE_REPOSITORY_MODULE;
attendeeRepositoryModule.bind(token).toClass(AttendeeRepository, [DI_TOKENS.PRISMA_CLIENT]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    container.load(moduleToken, attendeeRepositoryModule);
  },
};

