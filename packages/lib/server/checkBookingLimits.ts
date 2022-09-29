import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import { BookingLimit } from "@calcom/types/Calendar";

import { HttpError } from "./http-error";

export async function checkBookingLimits(bookingLimits: BookingLimit, eventStartDate: Date, eventId: number) {
  const limitCalculations = Object.entries(bookingLimits).map(
    async ([key, limitingNumber]) => await checkLimit({ key, limitingNumber, eventStartDate, eventId })
  );
  await Promise.all(limitCalculations).catch((error) => {
    throw new HttpError({ message: error.message, statusCode: 401 });
  });
  return true;
}

export async function checkLimit({
  eventStartDate,
  eventId,
  key,
  limitingNumber,
}: {
  eventStartDate: Date;
  eventId: number;
  key: string;
  limitingNumber: number;
}) {
  {
    const limitKey = key as keyof BookingLimit;
    // Take PER_DAY and turn it into day and PER_WEEK into week etc.
    const filter = limitKey.split("_")[1].toLocaleLowerCase() as "day" | "week" | "month" | "year"; // Have to cast here
    const startDate = dayjs(eventStartDate).startOf(filter).toDate();
    // this is parsed above with parseBookingLimit so we know it's safe.

    // This allows us to easily add it within dayjs
    const endDate = dayjs(startDate).endOf(filter).toDate();
    const bookingsInPeriod = await prisma.booking.count({
      where: {
        status: "ACCEPTED",
        eventType: {
          AND: [
            {
              id: eventId,
              bookings: {
                some: {
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
      throw new HttpError({
        message: `Booking limit of ${limitingNumber}:${key} reached for this eventType`,
        statusCode: 401,
      });
    }
  }
}
