import { BookingDataPreparationService } from "@calcom/features/bookings/lib/utils/BookingDataPreparationService";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as bookingRepositoryModuleLoader } from "@calcom/features/di/modules/Booking";
import { moduleLoader as userRepositoryModuleLoader } from "@calcom/features/di/modules/User";
import { moduleLoader as loggerModuleLoader } from "@calcom/features/di/shared/services/logger.service";
import { DI_TOKENS } from "@calcom/features/di/tokens";

const thisModule = createModule();
const token = DI_TOKENS.BOOKING_DATA_PREPARATION_SERVICE;
const moduleToken = DI_TOKENS.BOOKING_DATA_PREPARATION_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookingDataPreparationService,
  depsMap: {
    log: loggerModuleLoader,
    bookingRepository: bookingRepositoryModuleLoader,
    userRepository: userRepositoryModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;

export type { BookingDataPreparationService };
