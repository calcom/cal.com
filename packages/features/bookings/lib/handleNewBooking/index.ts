import type { BookingHandlerInput } from "@calcom/features/bookings/lib/dto/types";
import { getRegularBookingService } from "@calcom/features/bookings/di/RegularBookingService.container";

async function handler(input: BookingHandlerInput) {
  const regularBookingService = getRegularBookingService();
  const { bookingData, ...bookingMeta } = input;
  return regularBookingService.createBooking({
    bookingData,
    bookingMeta,
  });
}

export default handler;
