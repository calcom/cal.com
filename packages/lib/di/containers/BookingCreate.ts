import { createContainer } from "@evyweb/ioctopus";

import type { BookingCreateService } from "@calcom/lib/server/service/booking/BookingCreateService";
import { prismaModule } from "@calcom/prisma/prisma.module";

import { bookingRepositoryModule } from "../modules/Booking";
import { bookingCreateModule } from "../modules/BookingCreate";
import { cacheModule } from "../modules/Cache";
import { checkBookingAndDurationLimitsModule } from "../modules/CheckBookingAndDurationLimits";
import { checkBookingLimitsModule } from "../modules/CheckBookingLimits";
import { featuresRepositoryModule } from "../modules/Features";
import { handleNewBookingModule } from "../modules/HandleNewBooking";
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
container.load(DI_TOKENS.HANDLE_NEW_BOOKING_SERVICE_MODULE, handleNewBookingModule);
container.load(DI_TOKENS.BOOKING_CREATE_SERVICE_MODULE, bookingCreateModule);

export function getBookingCreateService(): BookingCreateService {
  return container.get<BookingCreateService>(DI_TOKENS.BOOKING_CREATE_SERVICE);
}
