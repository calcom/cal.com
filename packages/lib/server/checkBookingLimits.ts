import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { IntervalLimit } from "@calcom/types/Calendar";

import { getErrorFromUnknown } from "../errors";
import { HttpError } from "../http-error";
import { ascendingLimitKeys, intervalLimitKeyToUnit } from "../intervalLimit";
import { parseBookingLimit } from "../isBookingLimits";

export async function checkBookingLimits(
  bookingLimits: IntervalLimit,
  eventStartDate: Date,
  eventId: number,
  rescheduleUid?: string | undefined,
  timeZone?: string | null,
  userId?: number
) {
  const parsedBookingLimits = parseBookingLimit(bookingLimits);
  if (!parsedBookingLimits) return false;

  // not iterating entries to preserve types
  const limitCalculations = ascendingLimitKeys.map((key) =>
    checkBookingLimit({
      key,
      limitingNumber: parsedBookingLimits[key],
      eventStartDate,
      eventId,
      timeZone,
      rescheduleUid,
      userId,
    })
  );

  try {
    return !!(await Promise.all(limitCalculations));
  } catch (error) {
    throw new HttpError({ message: getErrorFromUnknown(error).message, statusCode: 401 });
  }
}

export async function checkBookingLimit({
  eventStartDate,
  eventId,
  key,
  limitingNumber,
  rescheduleUid,
  timeZone,
  userId,
  isGlobalBookingLimits,
}: {
  eventStartDate: Date;
  eventId: number;
  key: keyof IntervalLimit;
  limitingNumber: number | undefined;
  rescheduleUid?: string | undefined;
  timeZone?: string | null;
  userId?: number;
  isGlobalBookingLimits?: boolean;
}) {
  {
    const eventDateInOrganizerTz = timeZone ? dayjs(eventStartDate).tz(timeZone) : dayjs(eventStartDate);

    if (!limitingNumber) return;

    const unit = intervalLimitKeyToUnit(key);

    const startDate = dayjs(eventDateInOrganizerTz).startOf(unit).toDate();
    const endDate = dayjs(eventDateInOrganizerTz).endOf(unit).toDate();

    let whereInput = {};
    if (userId) {
      if (isGlobalBookingLimits) {
        whereInput = {
          userId,
          eventType: {
            schedulingType: null,
          },
        };
      } else {
        whereInput = {
          eventId,
          eventType: {
            userId,
          },
        };
      }
    }

    const bookingsInPeriod = await prisma.booking.count({
      where: {
        status: BookingStatus.ACCEPTED,
        // FIXME: bookings that overlap on one side will never be counted
        startTime: {
          gte: startDate,
        },
        endTime: {
          lte: endDate,
        },
        uid: {
          not: rescheduleUid,
        },
        ...whereInput,
      },
    });

    if (bookingsInPeriod < limitingNumber) return;

    throw new HttpError({
      message: `booking_limit_reached`,
      statusCode: 403,
    });
  }
}
