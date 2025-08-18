import { createModule } from "@evyweb/ioctopus";

import { BookingCreateService } from "@calcom/lib/server/service/booking/BookingCreateService";

import { DI_TOKENS } from "../tokens";

export const bookingCreateModule = createModule();

bookingCreateModule.bind(DI_TOKENS.BOOKING_CREATE_SERVICE).toClass(BookingCreateService, {
  handleNewBookingService: DI_TOKENS.HANDLE_NEW_BOOKING_SERVICE,
});
