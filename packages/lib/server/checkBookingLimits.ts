import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { IntervalLimit } from "@calcom/types/Calendar";

import { getErrorFromUnknown } from "../errors";
import { HttpError } from "../http-error";
import { intervalLimitKeyToUnit } from "../intervalLimit";
import { parseBookingLimit } from "../isBookingLimits";

export async function checkBookingLimits(
  bookingLimits: IntervalLimit,
  eventStartDate: Date,
  eventId: number,
  returnBusyTimes?: boolean
) {
  const parsedBookingLimits = parseBookingLimit(bookingLimits);
  if (!parsedBookingLimits) return false;

  const entries = Object.entries(parsedBookingLimits) as [keyof IntervalLimit, number][];
  const limitCalculations = entries.map(([key, limitingNumber]) =>
    checkBookingLimit({ key, limitingNumber, eventStartDate, eventId, returnBusyTimes })
  );

  try {
    const res = await Promise.all(limitCalculations);
    if (!returnBusyTimes) return true;
    return res;
  } catch (error) {
    throw new HttpError({ message: getErrorFromUnknown(error).message, statusCode: 401 });
  }
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
  key: keyof IntervalLimit;
  limitingNumber: number;
  returnBusyTimes?: boolean;
}) {
  {
    const unit = intervalLimitKeyToUnit(key);

    const startDate = dayjs(eventStartDate).startOf(unit).toDate();
    const endDate = dayjs(eventStartDate).endOf(unit).toDate();

    const bookingsInPeriod = await prisma.booking.count({
      where: {
        status: BookingStatus.ACCEPTED,
        eventTypeId: eventId,
        // FIXME: bookings that overlap on one side will never be counted
        startTime: {
          gte: startDate,
        },
        endTime: {
          lte: endDate,
        },
      },
    });

    if (bookingsInPeriod < limitingNumber) return;

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
