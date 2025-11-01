import { createContainer } from "@calcom/features/di/di";
import { loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { SHARED_TOKENS } from "@calcom/features/di/shared/shared.tokens";

import {
  type BookingEventHandlerService,
  moduleLoader as bookingEventHandlerServiceModule,
} from "./BookingEventHandlerService.module";

const container = createContainer();

export function getBookingEventHandlerService(): BookingEventHandlerService {
  // Load logger module
  container.load(SHARED_TOKENS.LOGGER, loggerServiceModule);
  
  bookingEventHandlerServiceModule.loadModule(container);

  return container.get<BookingEventHandlerService>(bookingEventHandlerServiceModule.token);
}

