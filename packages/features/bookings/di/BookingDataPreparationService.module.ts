import { BookingDataPreparationService } from "@calcom/features/bookings/lib/utils/BookingDataPreparationService";
import { bindModuleToClassOnToken, createModule } from "@calcom/features/di/di";
import { moduleLoader as bookingRepositoryModuleLoader } from "@calcom/features/di/modules/Booking";
import { moduleLoader as userRepositoryModuleLoader } from "@calcom/features/di/modules/User";
import { moduleLoader as loggerModuleLoader } from "@calcom/features/di/shared/services/logger.service";

import { BOOKING_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = BOOKING_DI_TOKENS.BOOKING_DATA_PREPARATION_SERVICE;
const moduleToken = BOOKING_DI_TOKENS.BOOKING_DATA_PREPARATION_SERVICE_MODULE;

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
};

export type { BookingDataPreparationService };
