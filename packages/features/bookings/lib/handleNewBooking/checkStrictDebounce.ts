import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["[checkStrictDebounce]"] });

export const checkStrictDebounce = async ({
  eventTypeId,
  strictDebounce,
  bookerEmail,
}: {
  eventTypeId: number;
  strictDebounce: boolean;
  bookerEmail: string;
}) => {
  if (!strictDebounce) {
    return;
  }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const existingBooking = await prisma.booking.findFirst({
    where: {
      eventTypeId,
      createdAt: {
        gte: twentyFourHoursAgo,
      },
      status: {
        in: [BookingStatus.ACCEPTED, BookingStatus.PENDING],
      },
      attendees: {
        some: {
          email: bookerEmail,
        },
      },
    },
    select: {
      id: true,
      createdAt: true,
    },
  });

  if (existingBooking) {
    log.warn(`Strict debounce triggered for ${bookerEmail} for event type ${eventTypeId}`);
    throw new ErrorWithCode(
      ErrorCode.StrictDebounceExceeded,
      ErrorCode.StrictDebounceExceeded,
      {
        bookingId: existingBooking.id,
        bookingCreatedAt: existingBooking.createdAt,
      }
    );
  }
};
