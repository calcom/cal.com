import { createContainer } from "@calcom/features/di/di";
import {
  type BookingEventHandlerService,
  moduleLoader as bookingEventHandlerServiceModule,
} from "./BookingEventHandlerService.module";

const container = createContainer();

export function getBookingEventHandlerService() {
  bookingEventHandlerServiceModule.loadModule(container);

  return container.get<BookingEventHandlerService>(bookingEventHandlerServiceModule.token);
}
