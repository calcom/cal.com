import type { Container } from "@evyweb/ioctopus";
import { createModule } from "@evyweb/ioctopus";

import { bookingRepositoryModule } from "@calcom/lib/di/modules/Booking";
import { cacheModule } from "@calcom/lib/di/modules/Cache";
import { checkBookingAndDurationLimitsModule } from "@calcom/lib/di/modules/CheckBookingAndDurationLimits";
import { checkBookingLimitsModule } from "@calcom/lib/di/modules/CheckBookingLimits";
import { featuresRepositoryModule } from "@calcom/lib/di/modules/Features";
import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";

import { RegularBookingService } from "../../handleNewBooking";

export const regularBookingServiceModule = createModule();
const moduleToken = DI_TOKENS.REGULAR_BOOKING_SERVICE;
regularBookingServiceModule.bind(moduleToken).toClass(RegularBookingService, {
  cacheService: DI_TOKENS.CACHE_SERVICE,
  checkBookingAndDurationLimitsService: DI_TOKENS.CHECK_BOOKING_AND_DURATION_LIMITS_SERVICE,
  prismaClient: DI_TOKENS.PRISMA_CLIENT,
  bookingRepository: DI_TOKENS.BOOKING_REPOSITORY,
  featuresRepository: DI_TOKENS.FEATURES_REPOSITORY,
  checkBookingLimitsService: DI_TOKENS.CHECK_BOOKING_LIMITS_SERVICE,
});

// Load the dependencies defined for the module above
function loadModuleDeps(container: Container) {
  container.load(DI_TOKENS.CACHE_SERVICE_MODULE, cacheModule);
  container.load(
    DI_TOKENS.CHECK_BOOKING_AND_DURATION_LIMITS_SERVICE_MODULE,
    checkBookingAndDurationLimitsModule
  );
  container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
  container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);
  container.load(DI_TOKENS.FEATURES_REPOSITORY_MODULE, featuresRepositoryModule);
  container.load(DI_TOKENS.CHECK_BOOKING_LIMITS_SERVICE_MODULE, checkBookingLimitsModule);
}

export { loadModuleDeps, moduleToken };
export type { RegularBookingService };
