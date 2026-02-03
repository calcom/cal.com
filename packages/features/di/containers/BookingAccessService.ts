import type { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";

import { createContainer } from "../di";
import { moduleLoader as bookingAccessServiceModuleLoader } from "../modules/BookingAccessService";

const container = createContainer();

export function getBookingAccessService() {
  bookingAccessServiceModuleLoader.loadModule(container);
  return container.get<BookingAccessService>(bookingAccessServiceModuleLoader.token);
}


