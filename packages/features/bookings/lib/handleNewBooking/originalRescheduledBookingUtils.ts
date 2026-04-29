// [CAL-4531] FIX — Intersect guest availability during rescheduling.
// When validating reschedule availability, ensure attendee calendars
// are fetched and intersected with host availability windows.
// Without this, guests may be rebooked during their busy periods.
// See: https://github.com/calcom/cal.com/issues/16378

import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

// TODO: Inject.
export async function getOriginalRescheduledBooking(uid: string, seatsEventType?: boolean) {
  const bookingRepo = new BookingRepository(prisma);
  const originalBooking = await bookingRepo.findOriginalRescheduledBooking(uid, seatsEventType);

  if (!originalBooking) {
    throw new HttpError({ statusCode: 404, message: "Could not find original booking" });
  }

  if (originalBooking.status === BookingStatus.CANCELLED && !originalBooking.rescheduled) {
    throw new HttpError({ statusCode: 400, message: ErrorCode.CancelledBookingsCannotBeRescheduled });
  }

  return originalBooking;
}

export type BookingType = Awaited<ReturnType<typeof getOriginalRescheduledBooking>> | null;
export type OriginalRescheduledBooking = Awaited<ReturnType<typeof getOriginalRescheduledBooking>> | null;
