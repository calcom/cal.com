import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { BookingAttendeesRemoveService } from "../services/BookingAttendeesRemoveService";
import { moduleLoader as bookingAttendeeRepositoryModuleLoader } from "./BookingAttendeeRepository.module";

const thisModule = createModule();
const token = DI_TOKENS.BOOKING_ATTENDEES_REMOVE_SERVICE;
const moduleToken = DI_TOKENS.BOOKING_ATTENDEES_REMOVE_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookingAttendeesRemoveService,
  depsMap: {
    bookingAttendeeRepository: bookingAttendeeRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { BookingAttendeesRemoveService };
