import type { BookingHandlerInput } from "@calcom/features/bookings/lib/dto/types";
import { getRegularBookingService } from "@calcom/features/bookings/di/RegularBookingService.container";

/**
 * Handler for creating new bookings.
 * This is the main entry point for booking creation.
 */
async function handler(input: BookingHandlerInput) {
  const regularBookingService = getRegularBookingService();
  const { bookingData, ...bookingMeta } = input;
  return regularBookingService.createBooking({
    bookingData,
    bookingMeta,
  });
}

export default handler;
