import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import type { BookingSeat } from "../handleSeats/types";
import {
  getOriginalRescheduledBooking,
  type OriginalRescheduledBooking,
} from "./getOriginalRescheduledBooking";

type InputProps = {
  reqBodyRescheduleUid?: string;
  seatsPerTimeSlot?: number | null;
};

const validateOriginalRescheduledBooking = async (originalRescheduledBooking: OriginalRescheduledBooking) => {
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

export const getSeatedBooking = async (bookingSeatUid: string): Promise<BookingSeat | null> => {
  // rescheduleUid can be bookingUid and bookingSeatUid
  return prisma.bookingSeat.findUnique({
    where: {
      referenceUid: bookingSeatUid,
    },
    include: {
      booking: true,
      attendee: true,
    },
  });
};

export const getOriginalRescheduledBookingAndSeat = async ({
  reqBodyRescheduleUid,
  seatsPerTimeSlot,
}: InputProps) => {
  if (!reqBodyRescheduleUid) {
    return { rescheduleUid: undefined, originalRescheduledBooking: null, bookingSeat: null };
  }

  const bookingSeat = await getSeatedBooking(reqBodyRescheduleUid);
  const rescheduleUid = bookingSeat ? bookingSeat.booking.uid : reqBodyRescheduleUid;
  const originalRescheduledBooking = await getOriginalRescheduledBooking(rescheduleUid, !!seatsPerTimeSlot);
  validateOriginalRescheduledBooking(originalRescheduledBooking);

  return { rescheduleUid, originalRescheduledBooking, bookingSeat };
};
