import { bindModuleToClassOnToken, createModule } from "@calcom/lib/di/di";
import { BookingCancelService } from "../lib/handleCancelBooking";
import { moduleLoader as bookingRepositoryModuleLoader } from "@calcom/lib/di/modules/Booking";
import { moduleLoader as bookingAttendeeRepositoryModuleLoader } from "./BookingAttendeeRepository.module";
import { moduleLoader as bookingReferenceRepositoryModuleLoader } from "./BookingReferenceRepository.module";
import { moduleLoader as profileRepositoryModuleLoader } from "@calcom/features/users/di/Profile.module";
import { moduleLoader as userRepositoryModuleLoader } from "@calcom/lib/di/modules/User";
 
import { DI_TOKENS } from "@calcom/lib/di/tokens";

const thisModule = createModule();
const token = DI_TOKENS.BOOKING_CANCEL_SERVICE;
const moduleToken = DI_TOKENS.BOOKING_CANCEL_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookingCancelService,
  depsMap: {
    userRepository: userRepositoryModuleLoader,
    bookingRepository: bookingRepositoryModuleLoader,
    profileRepository: profileRepositoryModuleLoader,
    bookingReferenceRepository: bookingReferenceRepositoryModuleLoader,
    attendeeRepository: bookingAttendeeRepositoryModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};

export type { BookingCancelService };
