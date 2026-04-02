import { CheckBookingAndDurationLimitsService } from "@calcom/features/bookings/lib/handleNewBooking/checkBookingAndDurationLimits";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "../di";
import { DI_TOKENS } from "../tokens";
import { moduleLoader as checkBookingLimitsModuleLoader } from "./CheckBookingLimits";

export const checkBookingAndDurationLimitsModule = createModule();
const token = DI_TOKENS.CHECK_BOOKING_AND_DURATION_LIMITS_SERVICE;
const moduleToken = DI_TOKENS.CHECK_BOOKING_AND_DURATION_LIMITS_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: checkBookingAndDurationLimitsModule,
  moduleToken,
  token,
  classs: CheckBookingAndDurationLimitsService,
  depsMap: {
    checkBookingLimitsService: checkBookingLimitsModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
