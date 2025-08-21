import { createModule } from "@evyweb/ioctopus";

import { BookingFactory } from "@calcom/features/bookings/lib/factory/BookingFactory";

import { DI_TOKENS } from "../tokens";

export const bookingFactoryModule = createModule();

bookingFactoryModule.bind(DI_TOKENS.BOOKING_FACTORY).toClass(BookingFactory, {
  bookingCreateService: DI_TOKENS.BOOKING_CREATE_SERVICE,
});
