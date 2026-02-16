import { RecurringBookingService } from "@calcom/features/bookings/lib/service/RecurringBookingService";
import { bindModuleToClassOnToken, createModule } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { moduleLoader as cachedTeamFeatureRepositoryModuleLoader } from "@calcom/features/flags/di/CachedTeamFeatureRepository.module";
import { moduleLoader as bookingEventHandlerModuleLoader } from "./BookingEventHandlerService.module";
import { moduleLoader as regularBookingServiceModuleLoader } from "./RegularBookingService.module";

const token = DI_TOKENS.RECURRING_BOOKING_SERVICE;
const moduleToken = DI_TOKENS.RECURRING_BOOKING_SERVICE_MODULE;
export const recurringBookingServiceModule = createModule();

const loadModule = bindModuleToClassOnToken({
  module: recurringBookingServiceModule,
  moduleToken,
  token,
  classs: RecurringBookingService,
  depsMap: {
    regularBookingService: regularBookingServiceModuleLoader,
    bookingEventHandler: bookingEventHandlerModuleLoader,
    teamFeatureRepository: cachedTeamFeatureRepositoryModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};
export type { RecurringBookingService };
