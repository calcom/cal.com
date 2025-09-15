import type { Prisma } from "@prisma/client";

import dayjs from "@calcom/dayjs";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

export async function getOriginalRescheduledBooking(uid: string, seatsEventType?: boolean) {
  const bookingRepo = new BookingRepository(prisma);
  const originalBooking = await bookingRepo.findOriginalRescheduledBooking(uid, seatsEventType);

  if (!originalBooking) {
    throw new HttpError({ statusCode: 404, message: "Could not find original booking" });
  }

  if (originalBooking.status === BookingStatus.CANCELLED && !originalBooking.rescheduled) {
    throw new HttpError({ statusCode: 400, message: ErrorCode.CancelledBookingsCannotBeRescheduled });
  }

  // Check minimum cancellation notice for reschedule
  const minimumCancellationNotice = originalBooking.eventType?.minimumCancellationNotice || 0;
  if (minimumCancellationNotice > 0) {
    const now = dayjs();
    const bookingStart = dayjs(originalBooking.startTime);
    const minutesUntilEvent = bookingStart.diff(now, 'minute');
    
    if (minutesUntilEvent < minimumCancellationNotice) {
      const hours = Math.floor(minimumCancellationNotice / 60);
      const minutes = minimumCancellationNotice % 60;
      let timeString = '';
      
      if (hours > 0 && minutes > 0) {
        timeString = `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`;
      } else if (hours > 0) {
        timeString = `${hours} hour${hours > 1 ? 's' : ''}`;
      } else {
        timeString = `${minutes} minute${minutes > 1 ? 's' : ''}`;
      }
      
      throw new HttpError({
        statusCode: 403,
        message: `Cannot reschedule within ${timeString} of event start`,
      });
    }
  }

  return originalBooking;
}

export type BookingType = Prisma.PromiseReturnType<typeof getOriginalRescheduledBooking> | null;

export type OriginalRescheduledBooking = Awaited<ReturnType<typeof getOriginalRescheduledBooking>> | null;