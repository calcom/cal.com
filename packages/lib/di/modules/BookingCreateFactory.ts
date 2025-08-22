import { createModule } from "@evyweb/ioctopus";

import { BookingCreateFactory } from "@calcom/features/bookings/lib/factory/BookingCreateFactory";

import { DI_TOKENS } from "../tokens";

export const bookingCreateFactoryModule = createModule();

bookingCreateFactoryModule.bind(DI_TOKENS.BOOKING_FACTORY).toClass(BookingCreateFactory, {
  bookingCreateService: DI_TOKENS.BOOKING_CREATE_SERVICE,
});
