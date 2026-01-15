import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["trigger-no-show-handler"] });

export const getBooking = async (bookingId: number) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: {
      id: bookingId,
    },
    select: {
      ...bookingMinimalSelect,
      uid: true,
      location: true,
      status: true,
      isRecorded: true,
      eventTypeId: true,
      references: true,
      fromReschedule: true,
      noShowHost: true,
      eventType: {
        select: {
          id: true,
          teamId: true,
          parentId: true,
          calVideoSettings: {
            select: {
              requireEmailForGuests: true,
            },
          },
          hosts: {
            select: {
              userId: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
          users: {
            select: {
              id: true,
              email: true,
            },
          },
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

    throw new HttpError({
      message: `Booking of id ${bookingId} does not exist or does not contain daily video as location`,
      statusCode: 404,
    });
  }
  return booking;
};
