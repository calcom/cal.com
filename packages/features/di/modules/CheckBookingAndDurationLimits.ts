import type { ICheckBookingAndDurationLimitsService } from "@calcom/features/bookings/lib/handleNewBooking/checkBookingAndDurationLimits";
import { CheckBookingAndDurationLimitsService } from "@calcom/features/bookings/lib/handleNewBooking/checkBookingAndDurationLimits";

import { type Container, createModule } from "../di";
import { DI_TOKENS } from "../tokens";

export const checkBookingAndDurationLimitsModule = createModule();
const token = DI_TOKENS.CHECK_BOOKING_AND_DURATION_LIMITS_SERVICE;
const moduleToken = DI_TOKENS.CHECK_BOOKING_AND_DURATION_LIMITS_SERVICE_MODULE;
checkBookingAndDurationLimitsModule.bind(token).toClass(CheckBookingAndDurationLimitsService, {
  checkBookingLimitsService: DI_TOKENS.CHECK_BOOKING_LIMITS_SERVICE,
} satisfies Record<keyof ICheckBookingAndDurationLimitsService, symbol>);

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, checkBookingAndDurationLimitsModule);
  },
};
