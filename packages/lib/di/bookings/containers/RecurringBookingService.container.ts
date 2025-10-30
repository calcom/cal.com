import { bookingRepositoryModule } from "@calcom/lib/di/modules/Booking";
import { cacheModule } from "@calcom/lib/di/modules/Cache";
import { checkBookingAndDurationLimitsModule } from "@calcom/lib/di/modules/CheckBookingAndDurationLimits";
import { checkBookingLimitsModule } from "@calcom/lib/di/modules/CheckBookingLimits";
import { featuresRepositoryModule } from "@calcom/lib/di/modules/Features";
import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";

import { createContainer } from "../../di";
import {
  type RecurringBookingService,
  recurringBookingServiceModule,
} from "../modules/RecurringBookingService.module";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);
container.load(DI_TOKENS.CACHE_SERVICE_MODULE, cacheModule);
container.load(DI_TOKENS.CHECK_BOOKING_LIMITS_SERVICE_MODULE, checkBookingLimitsModule);
container.load(DI_TOKENS.FEATURES_REPOSITORY_MODULE, featuresRepositoryModule);
container.load(
  DI_TOKENS.CHECK_BOOKING_AND_DURATION_LIMITS_SERVICE_MODULE,
  checkBookingAndDurationLimitsModule
);
container.load(DI_TOKENS.RECURRING_BOOKING_SERVICE_MODULE, recurringBookingServiceModule);

export function getRecurringBookingService(): RecurringBookingService {
  return container.get<RecurringBookingService>(DI_TOKENS.RECURRING_BOOKING_SERVICE);
}
