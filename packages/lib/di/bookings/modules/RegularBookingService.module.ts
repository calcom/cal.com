// eslint-disable-next-line no-restricted-imports
import { RegularBookingService } from "@calcom/features/bookings/lib/service/RegularBookingService";
import { moduleLoader as attributeRepositoryModuleLoader } from "@calcom/lib/di/modules/Attribute";
import { moduleLoader as bookingRepositoryModuleLoader } from "@calcom/lib/di/modules/Booking";
import { moduleLoader as cacheModuleLoader } from "@calcom/lib/di/modules/Cache";
import { moduleLoader as checkBookingAndDurationLimitsModuleLoader } from "@calcom/lib/di/modules/CheckBookingAndDurationLimits";
import { moduleLoader as checkBookingLimitsModuleLoader } from "@calcom/lib/di/modules/CheckBookingLimits";
// eslint-disable-next-line no-restricted-imports
import { moduleLoader as featuresRepositoryModuleLoader } from "@calcom/lib/di/modules/Features";
import { moduleLoader as hostRepositoryModuleLoader } from "@calcom/lib/di/modules/Host";
import { moduleLoader as luckyUserServiceModuleLoader } from "@calcom/lib/di/modules/LuckyUser";
import { moduleLoader as oooRepositoryModuleLoader } from "@calcom/lib/di/modules/Ooo";
import { moduleLoader as userRepositoryModuleLoader } from "@calcom/lib/di/modules/User";
import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { moduleLoader as prismaModuleLoader } from "@calcom/prisma/prisma.module";

import { bindModuleToClassOnToken, createModule } from "../../di";
import { moduleLoader as bookingMessageBusModuleLoader } from "./BookingMessageBus";

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
    bookingMessageBus: bookingMessageBusModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};

export type { RegularBookingService };
