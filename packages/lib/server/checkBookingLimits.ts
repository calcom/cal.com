import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import type { IntervalLimit } from "@calcom/types/Calendar";

import { HttpError } from "../http-error";
import { parseBookingLimit } from "../isBookingLimits";

export async function checkBookingLimits(
  bookingLimits: IntervalLimit,
  eventStartDate: Date,
  eventId: number,
  returnBusyTimes?: boolean
) {
  const parsedBookingLimits = parseBookingLimit(bookingLimits);
  if (parsedBookingLimits) {
    const limitCalculations = Object.entries(parsedBookingLimits).map(
      async ([key, limitingNumber]) =>
        await checkBookingLimit({ key, limitingNumber, eventStartDate, eventId, returnBusyTimes })
    );
    await Promise.all(limitCalculations)
      .then((res) => {
        if (returnBusyTimes) {
          return res;
        }
      })
      .catch((error) => {
        throw new HttpError({ message: error.message, statusCode: 401 });
      });
    return true;
  }
  return false;
}

export async function checkBookingLimit({
  eventStartDate,
  eventId,
  key,
  limitingNumber,
  returnBusyTimes = false,
}: {
  eventStartDate: Date;
  eventId: number;
  key: string;
  limitingNumber: number;
  returnBusyTimes?: boolean;
}) {
  {
    const limitKey = key as keyof IntervalLimit;
    // Take PER_DAY and turn it into day and PER_WEEK into week etc.
    const filter = limitKey.split("_")[1].toLocaleLowerCase() as "day" | "week" | "month" | "year"; // Have to cast here
    const startDate = dayjs(eventStartDate).startOf(filter).toDate();
    // this is parsed above with parseBookingLimit so we know it's safe.

    const endDate = dayjs(startDate).endOf(filter).toDate();

    // This allows us to easily add it within dayjs
    const bookingsInPeriod = await prisma.booking.count({
      where: {
        status: "ACCEPTED",
        eventType: {
          AND: [
            {
              id: eventId,
              bookings: {
                every: {
                  startTime: {
                    gte: startDate,
                  },
                  endTime: {
                    lte: endDate,
                  },
                },
              },
            },
          ],
        },
      },
    });
    if (bookingsInPeriod >= limitingNumber) {
      // This is used when getting availability
      if (returnBusyTimes) {
        return {
          start: startDate,
          end: endDate,
        };
      }

      throw new HttpError({
        message: `booking_limit_reached`,
        statusCode: 403,
      });
    }
  }
}
