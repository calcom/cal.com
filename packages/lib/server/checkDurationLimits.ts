import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";

import { HttpError } from "../http-error";
import { parseDurationLimit } from "../isDurationLimits";

export async function checkDurationLimits(durationLimits: any, eventStartDate: Date, eventId: number) {
  const parsedDurationLimits = parseDurationLimit(durationLimits);
  if (!parsedDurationLimits) {
    return false;
  }

  const limitCalculations = Object.entries(parsedDurationLimits).map(
    async ([key, limitingNumber]) =>
      await checkDurationLimit({ key, limitingNumber, eventStartDate, eventId })
  );

  await Promise.all(limitCalculations).catch((error) => {
    throw new HttpError({ message: error.message, statusCode: 401 });
  });

  return true;
}

export async function checkDurationLimit({
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
    // Take PER_DAY and turn it into day and PER_WEEK into week etc.
    const filter = key.split("_")[1].toLocaleLowerCase() as "day" | "week" | "month" | "year";
    const startDate = dayjs(eventStartDate).startOf(filter).toDate();
    const endDate = dayjs(startDate).endOf(filter).toDate();

    const bookingTimes = await prisma.booking.findMany({
      select: {
        startTime: true,
        endTime: true,
      },
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

    const totalBookingDuration = sumDuration(bookingTimes);
    if (totalBookingDuration >= limitingNumber) {
      // This is used when getting availability
      if (returnBusyTimes) {
        return {
          start: startDate,
          end: endDate,
        };
      }

      throw new HttpError({
        message: `duration_limit_reached`,
        statusCode: 403,
      });
    }
  }
}

// This is a helper function to sum the duration of all bookings
const sumDuration = (bookings: { startTime: Date; endTime: Date }[]) => {
  return bookings.reduce((acc, booking) => {
    const duration = dayjs(booking.endTime).diff(booking.startTime, "minute");
    return acc + duration;
  }, 0);
};
