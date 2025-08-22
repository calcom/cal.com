import { InstantBookingCreateService } from "@calcom/features/bookings/lib/service/InstantBookingCreateService";
import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { moduleLoader as prismaModuleLoader } from "@calcom/prisma/prisma.module";

import { createModule, bindModuleToClassOnToken } from "../../di";

export const instantBookingCreateServiceModule = createModule();
const token = DI_TOKENS.INSTANT_BOOKING_CREATE_SERVICE;
const moduleToken = DI_TOKENS.INSTANT_BOOKING_CREATE_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: instantBookingCreateServiceModule,
  moduleToken,
  token,
  classs: InstantBookingCreateService,
  depsMap: {
    prismaClient: prismaModuleLoader,
  },
});

export type { InstantBookingCreateService };
export const moduleLoader = {
  token,
  loadModule,
};
