import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";

import { RegularBookingService } from "../../handleNewBooking";

export const regularBookingServiceModule = createModule();

regularBookingServiceModule.bind(DI_TOKENS.REGULAR_BOOKING_SERVICE).toClass(RegularBookingService, {
  cacheService: DI_TOKENS.CACHE_SERVICE,
  checkBookingAndDurationLimitsService: DI_TOKENS.CHECK_BOOKING_AND_DURATION_LIMITS_SERVICE,
  prismaClient: DI_TOKENS.PRISMA_CLIENT,
  bookingRepository: DI_TOKENS.BOOKING_REPOSITORY,
});

export type { RegularBookingService };
