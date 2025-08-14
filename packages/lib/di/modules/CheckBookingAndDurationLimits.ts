import { createModule } from "@evyweb/ioctopus";

import type { ICheckBookingAndDurationLimitsService } from "@calcom/features/bookings/lib/handleNewBooking/checkBookingAndDurationLimits";
import { CheckBookingAndDurationLimitsService } from "@calcom/features/bookings/lib/handleNewBooking/checkBookingAndDurationLimits";

import { DI_TOKENS } from "../tokens";

export const checkBookingAndDurationLimitsModule = createModule();
checkBookingAndDurationLimitsModule
  .bind(DI_TOKENS.CHECK_BOOKING_AND_DURATION_LIMITS_SERVICE)
  .toClass(CheckBookingAndDurationLimitsService, {
    checkBookingLimitsService: DI_TOKENS.CHECK_BOOKING_LIMITS_SERVICE,
  } satisfies Record<keyof ICheckBookingAndDurationLimitsService, symbol>);
