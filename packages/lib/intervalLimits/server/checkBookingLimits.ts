import dayjs from "@calcom/dayjs";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { ascendingLimitKeys, intervalLimitKeyToUnit } from "../intervalLimit";
import type { IntervalLimit, IntervalLimitKey } from "../intervalLimitSchema";
import { parseBookingLimit } from "../isBookingLimits";

async function _checkBookingLimits(
  bookingLimits: IntervalLimit,
  eventStartDate: Date,
  eventId: number,
  rescheduleUid?: string | undefined,
  timeZone?: string | null,
  includeManagedEvents?: boolean
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
      includeManagedEvents,
    })
  );

  try {
    return !!(await Promise.all(limitCalculations));
  } catch (error) {
    throw new HttpError({ message: getErrorFromUnknown(error).message, statusCode: 401 });
  }
}

export const checkBookingLimits = withReporting(_checkBookingLimits, "checkBookingLimits");

async function _checkBookingLimit({
  eventStartDate,
  eventId,
  key,
  limitingNumber,
  rescheduleUid,
  timeZone,
  teamId,
  user,
  includeManagedEvents = false,
}: {
  eventStartDate: Date;
  eventId?: number;
  key: IntervalLimitKey;
  limitingNumber: number | undefined;
  rescheduleUid?: string | undefined;
  timeZone?: string | null;
  teamId?: number;
  user?: { id: number; email: string };
  includeManagedEvents?: boolean;
}) {
  {
    const eventDateInOrganizerTz = timeZone ? dayjs(eventStartDate).tz(timeZone) : dayjs(eventStartDate);

    if (!limitingNumber) return;

    const unit = intervalLimitKeyToUnit(key);

    const startDate = dayjs(eventDateInOrganizerTz).startOf(unit).toDate();
    const endDate = dayjs(eventDateInOrganizerTz).endOf(unit).toDate();

    let bookingsInPeriod;

    if (teamId && user) {
      const bookingRepo = new BookingRepository(prisma);
      bookingsInPeriod = await bookingRepo.getAllAcceptedTeamBookingsOfUser({
        user: { id: user.id, email: user.email },
        teamId,
        startDate: startDate,
        endDate: endDate,
        shouldReturnCount: true,
        excludedUid: rescheduleUid,
        includeManagedEvents,
      });
    } else {
      bookingsInPeriod = await prisma.booking.count({
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
          uid: {
            not: rescheduleUid,
          },
        },
      });
    }

    if (bookingsInPeriod < limitingNumber) return;

    throw new HttpError({
      message: `booking_limit_reached`,
      statusCode: 403,
    });
  }
}

export const checkBookingLimit = withReporting(_checkBookingLimit, "checkBookingLimit");
