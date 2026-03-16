import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as bookingRepositoryModuleLoader } from "@calcom/features/di/modules/Booking";
import { moduleLoader as featuresRepositoryModuleLoader } from "@calcom/features/di/modules/FeaturesRepository";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { BookingAttendeesService } from "../services/BookingAttendeesService";
import { moduleLoader as bookingAttendeeRepositoryModuleLoader } from "./BookingAttendeeRepository.module";
import { moduleLoader as bookingEventHandlerServiceModuleLoader } from "./BookingEventHandlerService.module";

const thisModule = createModule();
const token = DI_TOKENS.BOOKING_ATTENDEES_SERVICE;
const moduleToken = DI_TOKENS.BOOKING_ATTENDEES_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookingAttendeesService,
  depsMap: {
    bookingEventHandlerService: bookingEventHandlerServiceModuleLoader,
    featuresRepository: featuresRepositoryModuleLoader,
    bookingAttendeeRepository: bookingAttendeeRepositoryModuleLoader,
    bookingRepository: bookingRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { BookingAttendeesService };
