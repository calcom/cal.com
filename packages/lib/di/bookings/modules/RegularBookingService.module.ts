import { RegularBookingService } from "@calcom/features/bookings/lib/handleNewBooking";
import { moduleLoader as bookingRepositoryModuleLoader } from "@calcom/lib/di/modules/Booking";
import { moduleLoader as cacheModuleLoader } from "@calcom/lib/di/modules/Cache";
import { moduleLoader as checkBookingAndDurationLimitsModuleLoader } from "@calcom/lib/di/modules/CheckBookingAndDurationLimits";
import { moduleLoader as checkBookingLimitsModuleLoader } from "@calcom/lib/di/modules/CheckBookingLimits";
import { moduleLoader as featuresRepositoryModuleLoader } from "@calcom/lib/di/modules/Features";
import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { moduleLoader as prismaModuleLoader } from "@calcom/prisma/prisma.module";

import { bindModuleToClassOnToken, createModule } from "../../di";

const thisModule = createModule();
const token = DI_TOKENS.REGULAR_BOOKING_SERVICE;
const moduleToken = DI_TOKENS.REGULAR_BOOKING_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: RegularBookingService,
  depsMap: {
    cacheService: cacheModuleLoader,
    checkBookingAndDurationLimitsService: checkBookingAndDurationLimitsModuleLoader,
    prismaClient: prismaModuleLoader,
    bookingRepository: bookingRepositoryModuleLoader,
    featuresRepository: featuresRepositoryModuleLoader,
    checkBookingLimitsService: checkBookingLimitsModuleLoader,
  },
});

export const regularBookingServiceModule = {
  token,
  loadModule,
};

export type { RegularBookingService };
