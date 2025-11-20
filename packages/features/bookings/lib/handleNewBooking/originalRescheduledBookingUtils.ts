import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

// TODO: Inject.
export async function getOriginalRescheduledBooking(uid: string, seatsEventType?: boolean) {
  const bookingRepo = new BookingRepository(prisma);
  const originalBooking = await bookingRepo.findOriginalRescheduledBooking(uid, seatsEventType);

  if (!originalBooking) {
    throw new ErrorWithCode(ErrorCode.ResourceNotFound, "Could not find original booking");
  }

  if (originalBooking.status === BookingStatus.CANCELLED && !originalBooking.rescheduled) {
    throw new ErrorWithCode(
      ErrorCode.CancelledBookingsCannotBeRescheduled,
      ErrorCode.CancelledBookingsCannotBeRescheduled
    );
  }

  return originalBooking;
}

export type BookingType = Awaited<ReturnType<typeof getOriginalRescheduledBooking>> | null;
export type OriginalRescheduledBooking = Awaited<ReturnType<typeof getOriginalRescheduledBooking>> | null;
