import { validateLimitOrder } from "@calcom/lib/validateLimitOrder";
import { bookingLimitsType } from "@calcom/prisma/zod-utils";
import type { BookingLimit } from "@calcom/types/Calendar";

export function isBookingLimit(obj: unknown): obj is BookingLimit {
  return bookingLimitsType.safeParse(obj).success;
}

export function parseBookingLimit(obj: unknown): BookingLimit | null {
  let bookingLimit: BookingLimit | null = null;
  if (isBookingLimit(obj)) bookingLimit = obj;
  return bookingLimit;
}

export const validateBookingLimitOrder = (input: BookingLimit) => {
  const validationOrderKeys = ["PER_DAY", "PER_WEEK", "PER_MONTH", "PER_YEAR"];
  return validateLimitOrder(input, validationOrderKeys);
};
