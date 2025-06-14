import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

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
  if (!maxActiveBookingsPerBooker) {
    return;
  }

  if (offerToRescheduleLastBooking) {
    await checkActiveBookingsLimitAndOfferReschedule({
      eventTypeId,
      maxActiveBookingsPerBooker,
      bookerEmail,
    });
  } else {
    await checkActiveBookingsLimit({ eventTypeId, maxActiveBookingsPerBooker, bookerEmail });
  }
};

/** If we don't need the last record then we should just use COUNT */
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
      startTime: {
        gte: new Date(),
      },
      status: {
        in: [BookingStatus.ACCEPTED],
      },
      attendees: {
        some: {
          email: bookerEmail,
        },
      },
    },
  });

  if (bookingsCount >= maxActiveBookingsPerBooker) {
    throw new ErrorWithCode(ErrorCode.BookerLimitExceeded, ErrorCode.BookerLimitExceeded);
  }
};

const checkActiveBookingsLimitAndOfferReschedule = async ({
  eventTypeId,
  maxActiveBookingsPerBooker,
  bookerEmail,
}: {
  eventTypeId: number;
  maxActiveBookingsPerBooker: number;
  bookerEmail: string;
}) => {
  const bookingsCount = await prisma.booking.findMany({
    where: {
      eventTypeId,
      startTime: {
        gte: new Date(),
      },
      status: {
        in: [BookingStatus.ACCEPTED],
      },
      attendees: {
        some: {
          email: bookerEmail,
        },
      },
    },
    orderBy: {
      startTime: "desc",
    },
    take: maxActiveBookingsPerBooker,
    select: {
      uid: true,
      startTime: true,
      attendees: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  const lastBooking = bookingsCount[bookingsCount.length - 1];

  if (bookingsCount.length >= maxActiveBookingsPerBooker) {
    throw new ErrorWithCode(
      ErrorCode.BookerLimitExceededReschedule,
      ErrorCode.BookerLimitExceededReschedule,
      {
        rescheduleUid: lastBooking.uid,
        startTime: lastBooking.startTime,
        attendees: lastBooking.attendees,
      }
    );
  }
};
