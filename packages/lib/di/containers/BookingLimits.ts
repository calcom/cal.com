import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";

import type { CheckBookingAndDurationLimitsService } from "../../../features/bookings/lib/handleNewBooking/checkBookingAndDurationLimits";
import type { CheckBookingLimitsService } from "../../intervalLimits/server/checkBookingLimits";
import { bookingRepositoryModule } from "../modules/Booking";
import { checkBookingAndDurationLimitsModule } from "../modules/CheckBookingAndDurationLimits";
import { checkBookingLimitsModule } from "../modules/CheckBookingLimits";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);
container.load(DI_TOKENS.CHECK_BOOKING_LIMITS_SERVICE_MODULE, checkBookingLimitsModule);
container.load(
  DI_TOKENS.CHECK_BOOKING_AND_DURATION_LIMITS_SERVICE_MODULE,
  checkBookingAndDurationLimitsModule
);

export function getCheckBookingLimitsService() {
  return container.get<CheckBookingLimitsService>(DI_TOKENS.CHECK_BOOKING_LIMITS_SERVICE);
}

export function getCheckBookingAndDurationLimitsService() {
  return container.get<CheckBookingAndDurationLimitsService>(
    DI_TOKENS.CHECK_BOOKING_AND_DURATION_LIMITS_SERVICE
  );
}
