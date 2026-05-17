import type { BookingStatus } from "@calcom/prisma/enums";

// Upper case the first letter of each word and replace underscores with spaces
export function bookingStatusToText(status: BookingStatus) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
