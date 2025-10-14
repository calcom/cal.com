import { RegularBookingService } from "@calcom/features/bookings/lib/handleNewBooking";
import { bindModuleToClassOnToken, createModule } from "@calcom/features/di/di";
import { moduleLoader as attributeRepositoryModuleLoader } from "@calcom/features/di/modules/Attribute";
import { moduleLoader as bookingRepositoryModuleLoader } from "@calcom/features/di/modules/Booking";
import { moduleLoader as cacheModuleLoader } from "@calcom/features/di/modules/Cache";
import { moduleLoader as checkBookingAndDurationLimitsModuleLoader } from "@calcom/features/di/modules/CheckBookingAndDurationLimits";
import { moduleLoader as checkBookingLimitsModuleLoader } from "@calcom/features/di/modules/CheckBookingLimits";
import { moduleLoader as featuresRepositoryModuleLoader } from "@calcom/features/di/modules/Features";
import { moduleLoader as hostRepositoryModuleLoader } from "@calcom/features/di/modules/Host";
import { moduleLoader as luckyUserServiceModuleLoader } from "@calcom/features/di/modules/LuckyUser";
import { moduleLoader as oooRepositoryModuleLoader } from "@calcom/features/di/modules/Ooo";
import { moduleLoader as userRepositoryModuleLoader } from "@calcom/features/di/modules/User";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { moduleLoader as prismaModuleLoader } from "@calcom/prisma/prisma.module";

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
    luckyUserService: luckyUserServiceModuleLoader,
    hostRepository: hostRepositoryModuleLoader,
    oooRepository: oooRepositoryModuleLoader,
    userRepository: userRepositoryModuleLoader,
    attributeRepository: attributeRepositoryModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};

export type { RegularBookingService };
