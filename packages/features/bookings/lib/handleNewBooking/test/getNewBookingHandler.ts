// eslint-disable-next-line no-restricted-imports
import type { BookingHandlerInput } from "@calcom/features/bookings/lib/dto/types";

async function handler(input: BookingHandlerInput) {
  const { getRegularBookingService } = await import(
    "@calcom/lib/di/bookings/containers/RegularBookingService.container"
  );
  const regularBookingService = getRegularBookingService();
  const { bookingData, ...bookingMeta } = input;
  return regularBookingService.createBooking({
    bookingData,
    bookingMeta,
  });
}

export function getNewBookingHandler() {
  return handler;
}
