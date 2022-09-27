import { bookingLimitsType } from "@calcom/prisma/zod-utils";
import { BookingLimit } from "@calcom/types/Calendar";

export function isBookingLimit(obj: unknown): obj is BookingLimit {
  return bookingLimitsType.safeParse(obj).success;
}

export function parseBookingLimit(obj: unknown): BookingLimit | null {
  let bookingLimit: BookingLimit | null = null;
  if (isBookingLimit(obj)) bookingLimit = obj;
  return bookingLimit;
}
