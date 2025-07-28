import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";

import type { CheckBookingLimitsService } from "../../intervalLimits/server/checkBookingLimits";
import { bookingRepositoryModule } from "../modules/booking";
import { checkBookingLimitsModule } from "../modules/check-booking-limits";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);
container.load(DI_TOKENS.CHECK_BOOKING_LIMITS_SERVICE_MODULE, checkBookingLimitsModule);

export function getCheckBookingLimitsService() {
  return container.get<CheckBookingLimitsService>(DI_TOKENS.CHECK_BOOKING_LIMITS_SERVICE);
}
