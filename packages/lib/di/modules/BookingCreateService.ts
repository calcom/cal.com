import { createModule } from "@evyweb/ioctopus";

import { BookingCreateService } from "@calcom/features/bookings/lib/service/BookingCreateService/BookingCreateService";

import { DI_TOKENS } from "../tokens";

export const bookingCreateModule = createModule();

bookingCreateModule.bind(DI_TOKENS.BOOKING_CREATE_SERVICE).toClass(BookingCreateService, {
  cacheService: DI_TOKENS.CACHE_SERVICE,
  checkBookingAndDurationLimitsService: DI_TOKENS.CHECK_BOOKING_AND_DURATION_LIMITS_SERVICE,
  prismaClient: DI_TOKENS.PRISMA_CLIENT,
  bookingRepository: DI_TOKENS.BOOKING_REPOSITORY,
});
