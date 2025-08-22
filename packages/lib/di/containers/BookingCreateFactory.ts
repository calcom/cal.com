import { createContainer } from "@evyweb/ioctopus";

import type { BookingCreateFactory } from "@calcom/features/bookings/lib/factory/BookingCreateFactory";
import { prismaModule } from "@calcom/prisma/prisma.module";

import { bookingRepositoryModule } from "../modules/Booking";
import { bookingCreateFactoryModule } from "../modules/BookingCreateFactory";
import { bookingCreateModule } from "../modules/BookingCreateService";
import { cacheModule } from "../modules/Cache";
import { checkBookingAndDurationLimitsModule } from "../modules/CheckBookingAndDurationLimits";
import { checkBookingLimitsModule } from "../modules/CheckBookingLimits";
import { featuresRepositoryModule } from "../modules/Features";
import { instantBookingCreateModule } from "../modules/InstantBookingCreateService";
import { recurringBookingCreateModule } from "../modules/RecurringBookingCreateService";
import { DI_TOKENS } from "../tokens";

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
container.load(DI_TOKENS.BOOKING_CREATE_SERVICE_MODULE, bookingCreateModule);
container.load(DI_TOKENS.RECURRING_BOOKING_CREATE_SERVICE_MODULE, recurringBookingCreateModule);
container.load(DI_TOKENS.INSTANT_BOOKING_CREATE_SERVICE_MODULE, instantBookingCreateModule);
container.load(DI_TOKENS.BOOKING_CREATE_FACTORY_MODULE, bookingCreateFactoryModule);

export function getBookingCreateFactory(): BookingCreateFactory {
  return container.get<BookingCreateFactory>(DI_TOKENS.BOOKING_CREATE_FACTORY);
}
