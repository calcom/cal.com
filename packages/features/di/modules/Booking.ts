import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { createModule, bindModuleToClassOnToken, type ModuleLoader } from "../di";

export const bookingRepositoryModule = createModule();
const token = DI_TOKENS.BOOKING_REPOSITORY;
const moduleToken = DI_TOKENS.BOOKING_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: bookingRepositoryModule,
  moduleToken,
  token,
  classs: BookingRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
