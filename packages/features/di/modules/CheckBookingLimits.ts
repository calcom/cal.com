import { DI_TOKENS } from "@calcom/features/di/tokens";
import { CheckBookingLimitsService } from "@calcom/features/bookings/lib/checkBookingLimits";

import { type Container, createModule } from "../di";

const token = DI_TOKENS.CHECK_BOOKING_LIMITS_SERVICE;
const moduleToken = DI_TOKENS.CHECK_BOOKING_LIMITS_SERVICE_MODULE;
export const checkBookingLimitsModule = createModule();
checkBookingLimitsModule
  .bind(token)
  .toClass(CheckBookingLimitsService, { bookingRepo: DI_TOKENS.BOOKING_REPOSITORY });

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, checkBookingLimitsModule);
  },
};
