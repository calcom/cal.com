import { createContainer } from "@calcom/features/di/di";
import {
  type BookingAttendeesService,
  moduleLoader as bookingAttendeesServiceModule,
} from "./BookingAttendeesService.module";

const bookingAttendeesServiceContainer = createContainer();

export function getBookingAttendeesService(): BookingAttendeesService {
  bookingAttendeesServiceModule.loadModule(bookingAttendeesServiceContainer);

  return bookingAttendeesServiceContainer.get<BookingAttendeesService>(bookingAttendeesServiceModule.token);
}
