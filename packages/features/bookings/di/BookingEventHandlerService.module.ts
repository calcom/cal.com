import { BookingEventHandlerService } from "@calcom/features/bookings/lib/onBookingEvents/BookingEventHandlerService";
import { bindModuleToClassOnToken, createModule } from "@calcom/features/di/di";
import { SHARED_TOKENS } from "@calcom/features/di/shared/shared.tokens";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { moduleLoader as hashedLinkServiceModuleLoader } from "@calcom/features/hashedLink/di/HashedLinkService.module";
import { BookingAuditService } from "@calcom/features/booking-audit/lib/service/BookingAuditService";

const thisModule = createModule();
const token = DI_TOKENS.BOOKING_EVENT_HANDLER_SERVICE;
const moduleToken = DI_TOKENS.BOOKING_EVENT_HANDLER_SERVICE_MODULE;

// Custom factory to handle BookingAuditService creation
thisModule.bind(token).toFactory(async (container: any) => {
  const log = await container.get(SHARED_TOKENS.LOGGER);
  const hashedLinkServiceToken = await hashedLinkServiceModuleLoader.loadModule(container);
  const hashedLinkService = await container.get(hashedLinkServiceToken);
  const bookingAuditService = BookingAuditService.create();

  return new BookingEventHandlerService({
    log,
    hashedLinkService,
    bookingAuditService,
  });
});

const loadModule = async (container: any) => {
  if (!container.isBound(moduleToken)) {
    container.load(moduleToken, thisModule);
  }
  return token;
};

export const moduleLoader = {
  token,
  loadModule,
};

export type { BookingEventHandlerService };

