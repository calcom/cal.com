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

  // Sort booking limits by validationOrder
  const sorted = Object.entries(input)
    .sort(([, value], [, valuetwo]) => {
      return value - valuetwo;
    })
    .map(([key]) => key);

  const validationOrderWithoutMissing = validationOrderKeys.filter((key) => sorted.includes(key));

  const isValid = sorted.every((key, index) => validationOrderWithoutMissing[index] === key);

  return isValid;
};
