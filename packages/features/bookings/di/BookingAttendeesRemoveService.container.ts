import { createContainer } from "@calcom/features/di/di";
import {
  type BookingAttendeesRemoveService,
  moduleLoader as bookingAttendeesRemoveServiceModule,
} from "./BookingAttendeesRemoveService.module";

const bookingAttendeesRemoveServiceContainer = createContainer();

export function getBookingAttendeesRemoveService(): BookingAttendeesRemoveService {
  bookingAttendeesRemoveServiceModule.loadModule(bookingAttendeesRemoveServiceContainer);

  return bookingAttendeesRemoveServiceContainer.get<BookingAttendeesRemoveService>(
    bookingAttendeesRemoveServiceModule.token
  );
}
