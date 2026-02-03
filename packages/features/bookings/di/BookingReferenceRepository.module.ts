import { bindModuleToClassOnToken, createModule } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { BookingReferenceRepository } from "@calcom/lib/server/repository/bookingReference";
import { moduleLoader as prismaModuleLoader } from "@calcom/prisma/prisma.module";

export const bookingReferenceRepositoryModule = createModule();
const token = DI_TOKENS.BOOKING_REFERENCE_REPOSITORY;
const moduleToken = DI_TOKENS.BOOKING_REFERENCE_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: bookingReferenceRepositoryModule,
  moduleToken,
  token,
  classs: BookingReferenceRepository,
  depsMap: {
    prismaClient: prismaModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};
