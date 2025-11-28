import { moduleLoader as bookingEventHandlerModuleLoader } from "@calcom/features/bookings/di/BookingEventHandlerService.module";
import { RegularBookingService } from "@calcom/features/bookings/lib/service/RegularBookingService";
import { bindModuleToClassOnToken, createModule } from "@calcom/features/di/di";
import { moduleLoader as bookingRepositoryModuleLoader } from "@calcom/features/di/modules/Booking";
import { moduleLoader as checkBookingAndDurationLimitsModuleLoader } from "@calcom/features/di/modules/CheckBookingAndDurationLimits";
import { moduleLoader as luckyUserServiceModuleLoader } from "@calcom/features/di/modules/LuckyUser";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { moduleLoader as routingFormResponseRepositoryModuleLoader } from "@calcom/features/di/modules/RoutingFormResponse";
import { moduleLoader as selectedSlotsRepositoryModuleLoader } from "@calcom/features/di/modules/SelectedSlots";
import { moduleLoader as userRepositoryModuleLoader } from "@calcom/features/di/modules/User";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { moduleLoader as hashedLinkServiceModuleLoader } from "@calcom/features/hashedLink/di/HashedLinkService.module";

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
    checkBookingAndDurationLimitsService: checkBookingAndDurationLimitsModuleLoader,
    bookingRepository: bookingRepositoryModuleLoader,
    selectedSlotsRepository: selectedSlotsRepositoryModuleLoader,
    luckyUserService: luckyUserServiceModuleLoader,
    userRepository: userRepositoryModuleLoader,
    hashedLinkService: hashedLinkServiceModuleLoader,
    routingFormResponseRepository: routingFormResponseRepositoryModuleLoader,
    bookingEventHandler: bookingEventHandlerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};

export type { RegularBookingService };
