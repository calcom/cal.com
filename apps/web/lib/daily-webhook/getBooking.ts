import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["daily-video-webhook-handler"] });

export const getBooking = async (bookingId: number) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: {
      id: bookingId,
    },
    select: {
      ...bookingMinimalSelect,
      uid: true,
      location: true,
      isRecorded: true,
      eventTypeId: true,
      eventType: {
        select: {
          teamId: true,
          parentId: true,
        },
      },
      user: {
        select: {
          id: true,
          timeZone: true,
          email: true,
          name: true,
          locale: true,
          destinationCalendar: true,
        },
      },
    },
  });

  if (!booking) {
    log.error(
      "Couldn't find Booking Id:",
      safeStringify({
        bookingId,
      })
    );
  }
  return booking;
};

export type getBookingResponse = Awaited<ReturnType<typeof getBooking>>;
