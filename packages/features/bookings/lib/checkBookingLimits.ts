import type { Prisma } from "@calcom/prisma/client";
import dayjs from "@calcom/dayjs";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import { ascendingLimitKeys, intervalLimitKeyToUnit } from "@calcom/lib/intervalLimits/intervalLimit";
import type { IntervalLimit, IntervalLimitKey } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { parseBookingLimit } from "@calcom/lib/intervalLimits/isBookingLimits";
import { withReporting } from "@calcom/lib/sentryWrapper";

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
    user?: { id: number; email: string },
    isGlobalBookingLimits?: boolean,
    includeManagedEvents?: boolean
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
        user,
        isGlobalBookingLimits,
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
    isGlobalBookingLimits = false,
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
    isGlobalBookingLimits?: boolean;
    includeManagedEvents?: boolean;
  }) {
    const eventDateInOrganizerTz = timeZone ? dayjs(eventStartDate).tz(timeZone) : dayjs(eventStartDate);

    if (!limitingNumber) return;

    const unit = intervalLimitKeyToUnit(key);

    const startDate = dayjs(eventDateInOrganizerTz).startOf(unit).toDate();
    const endDate = dayjs(eventDateInOrganizerTz).endOf(unit).toDate();

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
    } else if (user) {
      bookingsInPeriod = await this.dependencies.bookingRepo.getAllAcceptedUserBookings({
        userId: user.id,
        startDate: startDate,
        endDate: endDate,
        shouldReturnCount: true,
        excludedUid: rescheduleUid,
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
