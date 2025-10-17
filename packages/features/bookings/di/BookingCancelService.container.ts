import { createContainer } from "@calcom/lib/di/di";

import {
  type BookingCancelService,
  moduleLoader as bookingCancelServiceModule,
} from "../modules/BookingCancelService.module";

const bookingCancelServiceContainer = createContainer();

export function getBookingCancelService(): BookingCancelService {
  bookingCancelServiceModule.loadModule(bookingCancelServiceContainer);

  return bookingCancelServiceContainer.get<BookingCancelService>(bookingCancelServiceModule.token);
}
