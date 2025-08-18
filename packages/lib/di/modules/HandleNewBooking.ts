import { createModule } from "@evyweb/ioctopus";

import { HandleNewBookingService } from "@calcom/features/bookings/lib/handleNewBooking";

import { DI_TOKENS } from "../tokens";

export const handleNewBookingModule = createModule();

handleNewBookingModule.bind(DI_TOKENS.HANDLE_NEW_BOOKING_SERVICE).toClass(HandleNewBookingService, {
  cacheService: DI_TOKENS.CACHE_SERVICE,
  checkBookingAndDurationLimitsService: DI_TOKENS.CHECK_BOOKING_AND_DURATION_LIMITS_SERVICE,
  prismaClient: DI_TOKENS.PRISMA_CLIENT,
  bookingRepository: DI_TOKENS.BOOKING_REPOSITORY,
});
