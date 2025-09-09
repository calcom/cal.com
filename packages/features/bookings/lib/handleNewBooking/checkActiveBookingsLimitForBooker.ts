/* eslint-disable @typescript-eslint/no-unused-vars */
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["[checkActiveBookingsLimitForBooker]"] });

export const checkActiveBookingsLimitForBooker = async ({
  eventTypeId,
  maxActiveBookingsPerBooker,
  bookerEmail,
  offerToRescheduleLastBooking,
}: {
  eventTypeId: number;
  maxActiveBookingsPerBooker: number | null;
  bookerEmail: string;
  offerToRescheduleLastBooking: boolean;
}) => {
  if (!maxActiveBookingsPerBooker) return;

  const activeBookings = await prisma.booking.findMany({
    where: {
      eventTypeId,
      status: { in: [BookingStatus.ACCEPTED, BookingStatus.PENDING] },
      attendees: { some: { email: bookerEmail } },
    },
    orderBy: { startTime: "desc" },
  });

  if (activeBookings.length < maxActiveBookingsPerBooker) {
    return;
  }

  if (offerToRescheduleLastBooking) {
    const bookingToReschedule = activeBookings[maxActiveBookingsPerBooker - 1];

    await prisma.booking.update({
      where: { id: bookingToReschedule.id },
      data: { status: BookingStatus.CANCELLED, rescheduled: true },
    });

    throw new ErrorWithCode(
      ErrorCode.BookerLimitExceededReschedule,
      "Previous booking has been rescheduled",
      {
        previousDate: bookingToReschedule.startTime.toISOString(),
        rescheduleUid: bookingToReschedule.uid,
      }
    );
  } else {
    log.warn(`Maximum booking limit reached for ${bookerEmail} for event type ${eventTypeId}`);
    throw new ErrorWithCode(ErrorCode.BookerLimitExceeded, "Maximum booking limit reached");
  }
};

const checkActiveBookingsLimit = async ({
  eventTypeId,
  maxActiveBookingsPerBooker,
  bookerEmail,
}: {
  eventTypeId: number;
  maxActiveBookingsPerBooker: number;
  bookerEmail: string;
}) => {
  const bookingsCount = await prisma.booking.count({
    where: {
      eventTypeId,
      startTime: { gte: new Date() },
      status: { in: [BookingStatus.ACCEPTED] },
      attendees: { some: { email: bookerEmail } },
    },
  });

  if (bookingsCount >= maxActiveBookingsPerBooker) {
    log.warn(`Maximum booking limit reached for ${bookerEmail} for event type ${eventTypeId}`);
    throw new ErrorWithCode(ErrorCode.BookerLimitExceeded, "Maximum booking limit reached");
  }
};
