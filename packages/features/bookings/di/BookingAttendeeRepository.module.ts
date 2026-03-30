import { PrismaBookingAttendeeRepository } from "@calcom/features/bookings/repositories/PrismaBookingAttendeeRepository";
import { bindModuleToClassOnToken, createModule } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

export const bookingAttendeeRepositoryModule = createModule();
const token = DI_TOKENS.BOOKING_ATTENDEE_REPOSITORY;
const moduleToken = DI_TOKENS.BOOKING_ATTENDEE_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: bookingAttendeeRepositoryModule,
  moduleToken,
  token,
  classs: PrismaBookingAttendeeRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader = {
  token,
  loadModule,
};
