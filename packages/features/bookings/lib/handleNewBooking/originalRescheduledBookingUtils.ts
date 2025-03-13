import type { Prisma } from "@prisma/client";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { BookingStatus } from "@calcom/prisma/enums";

export const validateOriginalRescheduledBooking = async (
  originalRescheduledBooking: OriginalRescheduledBooking
) => {
  if (!originalRescheduledBooking) {
    throw new HttpError({ statusCode: 404, message: "Could not find original booking" });
  }

  if (
    originalRescheduledBooking.status === BookingStatus.CANCELLED &&
    !originalRescheduledBooking.rescheduled
  ) {
    throw new HttpError({ statusCode: 403, message: ErrorCode.CancelledBookingsCannotBeRescheduled });
  }
};

export async function getOriginalRescheduledBooking(uid: string, seatsEventType?: boolean) {
  const originalBooking = await BookingRepository.findOriginalRescheduledBooking(uid, seatsEventType);
  validateOriginalRescheduledBooking(originalBooking);

  return originalBooking;
}

export type BookingType = Prisma.PromiseReturnType<typeof getOriginalRescheduledBooking>;

export type OriginalRescheduledBooking = Awaited<ReturnType<typeof getOriginalRescheduledBooking>>;
