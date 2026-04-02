import { AttendeeRepository } from "@calcom/features/bookings/repositories/AttendeeRepository";
import { type Container, createModule } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";

export const attendeeRepositoryModule = createModule();
const token = DI_TOKENS.ATTENDEE_REPOSITORY;
const moduleToken = DI_TOKENS.ATTENDEE_REPOSITORY_MODULE;
attendeeRepositoryModule.bind(token).toClass(AttendeeRepository, [DI_TOKENS.PRISMA_CLIENT]);

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, attendeeRepositoryModule);
  },
};
