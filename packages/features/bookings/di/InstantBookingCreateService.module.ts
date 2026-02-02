import { InstantBookingCreateService } from "@calcom/features/bookings/lib/service/InstantBookingCreateService";
import { createModule, bindModuleToClassOnToken } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

export const instantBookingCreateServiceModule = createModule();
const token = DI_TOKENS.INSTANT_BOOKING_CREATE_SERVICE;
const moduleToken = DI_TOKENS.INSTANT_BOOKING_CREATE_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: instantBookingCreateServiceModule,
  moduleToken,
  token,
  classs: InstantBookingCreateService,
  depsMap: {
    // TODO: In a followup PR, we aim to remove prisma dependency and instead inject the repositories as dependencies.
    prismaClient: prismaModuleLoader,
  },
});

export type { InstantBookingCreateService };
export const moduleLoader = {
  token,
  loadModule,
};
