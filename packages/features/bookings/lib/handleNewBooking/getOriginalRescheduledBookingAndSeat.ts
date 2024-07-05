import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import type { BookingSeat } from "../handleSeats/types";
import {
  getOriginalRescheduledBooking,
  type OriginalRescheduledBooking,
} from "./getOriginalRescheduledBooking";
import type { BookingType } from "./types";

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

export const getOriginalRescheduledBookingAndSeat = async ({
  reqBodyRescheduleUid,
  seatsPerTimeSlot,
}: InputProps) => {
  let rescheduleUid = reqBodyRescheduleUid;
  let bookingSeat: BookingSeat = null;
  let originalRescheduledBooking: BookingType = null;

  //this gets the original rescheduled booking
  if (rescheduleUid) {
    // rescheduleUid can be bookingUid and bookingSeatUid
    bookingSeat = await prisma.bookingSeat.findUnique({
      where: {
        referenceUid: rescheduleUid,
      },
      include: {
        booking: true,
        attendee: true,
      },
    });
    if (bookingSeat) {
      rescheduleUid = bookingSeat.booking.uid;
    }
    originalRescheduledBooking = await getOriginalRescheduledBooking(rescheduleUid, !!seatsPerTimeSlot);

    validateOriginalRescheduledBooking(originalRescheduledBooking);
  }

  return { rescheduleUid, originalRescheduledBooking, bookingSeat };
};
