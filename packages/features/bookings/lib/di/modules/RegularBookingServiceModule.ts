import type { Container } from "@evyweb/ioctopus";
import { createModule } from "@evyweb/ioctopus";

import { attributeRepositoryModule } from "@calcom/lib/di/modules/Attribute";
import { bookingRepositoryModule } from "@calcom/lib/di/modules/Booking";
import { cacheModule } from "@calcom/lib/di/modules/Cache";
import { checkBookingAndDurationLimitsModule } from "@calcom/lib/di/modules/CheckBookingAndDurationLimits";
import { checkBookingLimitsModule } from "@calcom/lib/di/modules/CheckBookingLimits";
import { featuresRepositoryModule } from "@calcom/lib/di/modules/Features";
import { hostRepositoryModule } from "@calcom/lib/di/modules/Host";
import { luckyUserServiceModule } from "@calcom/lib/di/modules/LuckyUser";
import { oooRepositoryModule } from "@calcom/lib/di/modules/Ooo";
import { userRepositoryModule } from "@calcom/lib/di/modules/User";
import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";

import { RegularBookingService } from "../../handleNewBooking";

export const regularBookingServiceModule = createModule();
const token = DI_TOKENS.REGULAR_BOOKING_SERVICE;
const moduleToken = DI_TOKENS.REGULAR_BOOKING_SERVICE_MODULE;
regularBookingServiceModule.bind(token).toClass(RegularBookingService, {
  cacheService: DI_TOKENS.CACHE_SERVICE,
  checkBookingAndDurationLimitsService: DI_TOKENS.CHECK_BOOKING_AND_DURATION_LIMITS_SERVICE,
  prismaClient: DI_TOKENS.PRISMA_CLIENT,
  bookingRepository: DI_TOKENS.BOOKING_REPOSITORY,
  featuresRepository: DI_TOKENS.FEATURES_REPOSITORY,
  checkBookingLimitsService: DI_TOKENS.CHECK_BOOKING_LIMITS_SERVICE,
  luckyUserService: DI_TOKENS.LUCKY_USER_SERVICE,
  hostRepository: DI_TOKENS.HOST_REPOSITORY,
  oooRepository: DI_TOKENS.OOO_REPOSITORY,
  userRepository: DI_TOKENS.USER_REPOSITORY,
  attributeRepository: DI_TOKENS.ATTRIBUTE_REPOSITORY,
});

// Load the dependencies defined for the module above
function loadModule(container: Container) {
  container.load(DI_TOKENS.REGULAR_BOOKING_SERVICE_MODULE, regularBookingServiceModule);
  container.load(DI_TOKENS.CACHE_SERVICE_MODULE, cacheModule);
  container.load(
    DI_TOKENS.CHECK_BOOKING_AND_DURATION_LIMITS_SERVICE_MODULE,
    checkBookingAndDurationLimitsModule
  );
  container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
  container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);
  container.load(DI_TOKENS.FEATURES_REPOSITORY_MODULE, featuresRepositoryModule);
  container.load(DI_TOKENS.CHECK_BOOKING_LIMITS_SERVICE_MODULE, checkBookingLimitsModule);
  container.load(DI_TOKENS.LUCKY_USER_SERVICE_MODULE, luckyUserServiceModule);
  container.load(DI_TOKENS.HOST_REPOSITORY_MODULE, hostRepositoryModule);
  container.load(DI_TOKENS.OOO_REPOSITORY_MODULE, oooRepositoryModule);
  container.load(DI_TOKENS.USER_REPOSITORY_MODULE, userRepositoryModule);
  container.load(DI_TOKENS.ATTRIBUTE_REPOSITORY_MODULE, attributeRepositoryModule);
}

export { loadModule, moduleToken, token };
export type { RegularBookingService };
