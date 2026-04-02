import { InstantBookingCreateService } from "@calcom/features/bookings/lib/service/InstantBookingCreateService";
import { bindModuleToClassOnToken, createModule } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";

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
