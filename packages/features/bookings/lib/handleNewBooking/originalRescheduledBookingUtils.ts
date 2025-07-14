import type { Prisma } from "@prisma/client";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

export enum BookingRescheduleState {
  CANCELLED,
  RESCHEDULED,
  CAN_RESCHEDULE,
}

export async function getOriginalRescheduledBooking(uid: string, seatsEventType?: boolean) {
  const bookingRepo = new BookingRepository(prisma);
  const originalBooking = await bookingRepo.findOriginalRescheduledBooking(uid, seatsEventType);

  if (!originalBooking) {
    throw new HttpError({ statusCode: 404, message: "Could not find original booking" });
  }

  const bookingRescheduleState = canRescheduleBooking(originalBooking);

  if (bookingRescheduleState === BookingRescheduleState.CANCELLED) {
    throw new HttpError({ statusCode: 400, message: ErrorCode.CancelledBookingsCannotBeRescheduled });
  }

  if (bookingRescheduleState === BookingRescheduleState.RESCHEDULED) {
    throw new HttpError({ statusCode: 400, message: ErrorCode.RescheduledBookingsCannotBeRescheduled });
  }
  return originalBooking;
}

export function canRescheduleBooking(booking: ReturnType<typeof getOriginalRescheduledBooking>) {
  if (booking.status === BookingStatus.CANCELLED && !booking.rescheduled) {
    return BookingRescheduleState.CANCELLED;
  }
  if (booking.status === BookingStatus.CANCELLED && booking.rescheduled) {
    return BookingRescheduleState.RESCHEDULED;
  }
  return BookingRescheduleState.CAN_RESCHEDULE;
}

export type BookingType = Prisma.PromiseReturnType<typeof getOriginalRescheduledBooking> | null;

export type OriginalRescheduledBooking = Awaited<ReturnType<typeof getOriginalRescheduledBooking>> | null;
