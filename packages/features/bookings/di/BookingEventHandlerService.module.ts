import { moduleLoader as bookingAuditProducerServiceModuleLoader } from "@calcom/features/booking-audit/di/BookingAuditTaskerProducerService.module";
import { BookingEventHandlerService } from "@calcom/features/bookings/lib/onBookingEvents/BookingEventHandlerService";
import { bindModuleToClassOnToken, createModule } from "@calcom/features/di/di";
import { moduleLoader as loggerModuleLoader } from "@calcom/features/di/shared/services/logger.service";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { moduleLoader as hashedLinkServiceModuleLoader } from "@calcom/features/hashedLink/di/HashedLinkService.module";

const thisModule = createModule();
const token = DI_TOKENS.BOOKING_EVENT_HANDLER_SERVICE;
const moduleToken = DI_TOKENS.BOOKING_EVENT_HANDLER_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookingEventHandlerService,
  depsMap: {
    hashedLinkService: hashedLinkServiceModuleLoader,
    bookingAuditProducerService: bookingAuditProducerServiceModuleLoader,
    log: loggerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};

export type { BookingEventHandlerService };
