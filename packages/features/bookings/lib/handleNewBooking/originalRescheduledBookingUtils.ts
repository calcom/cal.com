import type { Prisma } from "@prisma/client";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { BookingStatus } from "@calcom/prisma/enums";

export async function getOriginalRescheduledBooking(uid: string, seatsEventType?: boolean) {
  const originalBooking = await BookingRepository.findOriginalRescheduledBooking(uid, seatsEventType);

  if (!originalBooking) {
    throw new HttpError({ statusCode: 404, message: "Could not find original booking" });
  }

  if (originalBooking.status === BookingStatus.CANCELLED && !originalBooking.rescheduled) {
    throw new HttpError({ statusCode: 400, message: ErrorCode.CancelledBookingsCannotBeRescheduled });
  }

  return originalBooking;
}

export type BookingType = Prisma.PromiseReturnType<typeof getOriginalRescheduledBooking> | null;

export type OriginalRescheduledBooking = Awaited<ReturnType<typeof getOriginalRescheduledBooking>> | null;
