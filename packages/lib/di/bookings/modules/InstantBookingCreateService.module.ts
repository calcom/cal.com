// eslint-disable-next-line no-restricted-imports
import { InstantBookingCreateService } from "@calcom/features/instant-meeting/handleInstantMeeting";
import { DI_TOKENS } from "@calcom/lib/di/tokens";

import { createModule, bindModuleToClassOnToken } from "../../di";

export const instantBookingCreateServiceModule = createModule();
const token = DI_TOKENS.INSTANT_BOOKING_CREATE_SERVICE;
const moduleToken = DI_TOKENS.INSTANT_BOOKING_CREATE_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: instantBookingCreateServiceModule,
  moduleToken,
  token,
  classs: InstantBookingCreateService,
  depsMap: {},
});

export type { InstantBookingCreateService };
export const moduleLoader = {
  token,
  loadModule,
};
