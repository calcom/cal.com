import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { CheckBookingLimitsService } from "@calcom/lib/intervalLimits/server/checkBookingLimits";
import { createModule } from "@evyweb/ioctopus";

export const checkBookingLimitsModule = createModule();
checkBookingLimitsModule
  .bind(DI_TOKENS.CHECK_BOOKING_LIMITS_SERVICE)
  .toClass(CheckBookingLimitsService, { bookingRepo: DI_TOKENS.BOOKING_REPOSITORY });
