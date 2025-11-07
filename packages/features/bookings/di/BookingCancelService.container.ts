import { createContainer } from "@calcom/features/di/di";

import {
  type BookingCancelService,
  moduleLoader as bookingCancelServiceModule,
} from "./BookingCancelService.module";

const bookingCancelServiceContainer = createContainer();

export function getBookingCancelService(): BookingCancelService {
  bookingCancelServiceModule.loadModule(bookingCancelServiceContainer);

  return bookingCancelServiceContainer.get<BookingCancelService>(bookingCancelServiceModule.token);
}
