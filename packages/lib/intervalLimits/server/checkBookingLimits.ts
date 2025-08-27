import dayjs from "@calcom/dayjs";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import { withReporting } from "@calcom/lib/sentryWrapper";
import type { BookingRepository } from "@calcom/lib/server/repository/booking";

import { ascendingLimitKeys, intervalLimitKeyToUnit } from "../intervalLimit";
import type { IntervalLimit, IntervalLimitKey } from "../intervalLimitSchema";
import { parseBookingLimit } from "../isBookingLimits";

export interface ICheckBookingLimitsService {
  bookingRepo: BookingRepository;
}

export class CheckBookingLimitsService {
  constructor(private readonly dependencies: ICheckBookingLimitsService) {}

  private async _checkBookingLimits(
    bookingLimits: IntervalLimit,
    eventStartDate: Date,
    eventId: number,
    rescheduleUid?: string | undefined,
    timeZone?: string | null,
    includeManagedEvents?: boolean,
    weekStart?: number | null // Add weekStart parameter
  ) {
    const parsedBookingLimits = parseBookingLimit(bookingLimits);
    if (!parsedBookingLimits) return false;

    // not iterating entries to preserve types
    const limitCalculations = ascendingLimitKeys.map((key) =>
      this.checkBookingLimit({
        key,
        limitingNumber: parsedBookingLimits[key],
        eventStartDate,
        eventId,
        timeZone,
        rescheduleUid,
        includeManagedEvents,
        weekStart, // Pass weekStart to individual checks
      })
    );

    try {
      return !!(await Promise.all(limitCalculations));
    } catch (error) {
      throw new HttpError({ message: getErrorFromUnknown(error).message, statusCode: 401 });
    }
  }

  checkBookingLimits = withReporting(this._checkBookingLimits.bind(this), "checkBookingLimits");

  private async _checkBookingLimit({
    eventStartDate,
    eventId,
    key,
    limitingNumber,
    rescheduleUid,
    timeZone,
    teamId,
    user,
    includeManagedEvents = false,
    weekStart = 0, // Default to Sunday
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
    weekStart?: number | null;
  }) {
    const eventDateInOrganizerTz = timeZone ? dayjs(eventStartDate).tz(timeZone) : dayjs(eventStartDate);

    if (!limitingNumber) return;

    const unit = intervalLimitKeyToUnit(key);

    let startDate: Date;
    let endDate: Date;

    // Handle week boundaries with custom week start
    if (unit === "week" && weekStart !== null && weekStart !== undefined) {
      const dayOfWeek = eventDateInOrganizerTz.day();
      const daysToSubtract = (dayOfWeek - weekStart + 7) % 7;

      startDate = eventDateInOrganizerTz.subtract(daysToSubtract, "day").startOf("day").toDate();

      endDate = eventDateInOrganizerTz.subtract(daysToSubtract, "day").add(6, "day").endOf("day").toDate();
    } else {
      startDate = dayjs(eventDateInOrganizerTz).startOf(unit).toDate();
      endDate = dayjs(eventDateInOrganizerTz).endOf(unit).toDate();
    }

    let bookingsInPeriod;

    if (teamId && user) {
      bookingsInPeriod = await this.dependencies.bookingRepo.getAllAcceptedTeamBookingsOfUser({
        user: { id: user.id, email: user.email },
        teamId,
        startDate: startDate,
        endDate: endDate,
        shouldReturnCount: true,
        excludedUid: rescheduleUid,
        includeManagedEvents,
      });
    } else {
      bookingsInPeriod = await this.dependencies.bookingRepo.countBookingsByEventTypeAndDateRange({
        eventTypeId: eventId!,
        startDate,
        endDate,
        excludedUid: rescheduleUid,
      });
    }

    if (bookingsInPeriod < limitingNumber) return;

    throw new HttpError({
      message: `booking_limit_reached`,
      statusCode: 403,
    });
  }

  checkBookingLimit = withReporting(this._checkBookingLimit.bind(this), "checkBookingLimit");
}
