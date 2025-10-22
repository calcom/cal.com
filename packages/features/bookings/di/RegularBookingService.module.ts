import { RegularBookingService } from "@calcom/features/bookings/lib/service/RegularBookingService";
import { bindModuleToClassOnToken, createModule } from "@calcom/features/di/di";
import { moduleLoader as bookingRepositoryModuleLoader } from "@calcom/features/di/modules/Booking";
import { moduleLoader as cacheModuleLoader } from "@calcom/features/di/modules/Cache";
import { moduleLoader as checkBookingAndDurationLimitsModuleLoader } from "@calcom/features/di/modules/CheckBookingAndDurationLimits";
import { moduleLoader as luckyUserServiceModuleLoader } from "@calcom/features/di/modules/LuckyUser";
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
    // TODO: In a followup PR, we aim to remove prisma dependency and instead inject the repositories as dependencies.
    prismaClient: prismaModuleLoader,
    cacheService: cacheModuleLoader,
    checkBookingAndDurationLimitsService: checkBookingAndDurationLimitsModuleLoader,
    bookingRepository: bookingRepositoryModuleLoader,
    luckyUserService: luckyUserServiceModuleLoader,
    userRepository: userRepositoryModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};

export type { RegularBookingService };
