import dayjs from "@calcom/dayjs";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import { withReporting } from "@calcom/lib/sentryWrapper";
import type { BookingRepository } from "@calcom/lib/server/repository/booking";
import type { MembershipRepository } from "@calcom/lib/server/repository/membership";

import { ascendingLimitKeys, intervalLimitKeyToUnit } from "../intervalLimit";
import type { IntervalLimit, IntervalLimitKey } from "../intervalLimitSchema";
import { parseBookingLimit } from "../isBookingLimits";

export interface ICheckBookingLimitsService {
  bookingRepo: BookingRepository;
  membershipRepo: MembershipRepository;
}

export class CheckBookingLimitsService {
  constructor(private readonly dependencies: ICheckBookingLimitsService) {}

  private async _checkBookingLimits(
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
      this.checkBookingLimit({
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

  checkBookingLimits = withReporting(this._checkBookingLimits.bind(this), "checkBookingLimits");

  async checkMemberBookingLimits({
    userId,
    teamId,
    eventStartDate,
    rescheduleUid,
    timeZone,
    includeManagedEvents = false,
  }: {
    userId: number | null;
    teamId: number | null;
    eventStartDate: Date;
    rescheduleUid?: string;
    timeZone?: string | null;
    includeManagedEvents?: boolean;
  }) {
    if (!userId) {
      return;
    }

    // For personal event types, find any accepted membership with booking limits
    // For team event types, use the provided teamId
    let membership;
    if (teamId) {
      membership = await this.dependencies.membershipRepo.findUniqueByUserIdAndTeamIdInstance({
        userId,
        teamId,
      });
    } else {
      // Find first accepted membership for personal events
      membership = await this.dependencies.membershipRepo.findFirstAcceptedMembershipByUserIdInstance(userId);
    }
    if (!membership?.bookingLimits || Object.keys(membership.bookingLimits).length === 0) {
      return;
    }

    for (const [key, limit] of Object.entries(membership.bookingLimits)) {
      await this._checkMemberBookingLimit({
        eventStartDate,
        key: key as IntervalLimitKey,
        limitingNumber: limit as number,
        rescheduleUid,
        timeZone,
        teamId,
        userId,
        includeManagedEvents,
      });
    }
  }

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

  private async _checkMemberBookingLimit({
    eventStartDate,
    key,
    limitingNumber,
    rescheduleUid,
    timeZone,
    teamId,
    userId,
    includeManagedEvents: _includeManagedEvents = false,
  }: {
    eventStartDate: Date;
    key: IntervalLimitKey;
    limitingNumber: number;
    rescheduleUid?: string;
    timeZone?: string | null;
    teamId: number | null;
    userId: number | null;
    includeManagedEvents?: boolean;
  }) {
    const eventDateInOrganizerTz = timeZone ? dayjs(eventStartDate).tz(timeZone) : dayjs(eventStartDate);
    const unit = intervalLimitKeyToUnit(key);
    const startDate = dayjs(eventDateInOrganizerTz).startOf(unit).toDate();
    const endDate = dayjs(eventDateInOrganizerTz).endOf(unit).toDate();

    // Count ALL bookings for this member (personal + team) in the time period
    const totalBookingsInPeriod = await this.dependencies.bookingRepo.getAllBookingsForMemberInPeriod({
      userId,
      teamId,
      startDate,
      endDate,
      excludedUid: rescheduleUid,
    });
    if (totalBookingsInPeriod >= limitingNumber) {
      throw new HttpError({
        message: `Member booking limit reached.`,
        statusCode: 403,
      });
    }
  }

  checkBookingLimit = withReporting(this._checkBookingLimit.bind(this), "checkBookingLimit");
}
