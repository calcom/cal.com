import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { moduleLoader as bookingRepositoryModuleLoader } from "../modules/Booking";
import { createContainer } from "../di";

const bookingRepositoryContainer = createContainer();

export function getBookingRepository(): BookingRepository {
  bookingRepositoryModuleLoader.loadModule(bookingRepositoryContainer);
  return bookingRepositoryContainer.get<BookingRepository>(bookingRepositoryModuleLoader.token);
}
