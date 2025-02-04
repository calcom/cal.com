import type { Logger } from "tslog";

import { getBusyTimesForLimitChecks } from "@calcom/core/getBusyTimes";
import { getUsersAvailability } from "@calcom/core/getUserAvailability";
import dayjs from "@calcom/dayjs";
import type { Dayjs } from "@calcom/dayjs";
import { checkForConflicts } from "@calcom/features/bookings/lib/conflictChecker/checkForConflicts";
import { parseBookingLimit, parseDurationLimit } from "@calcom/lib";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { getPiiFreeUser } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";

import type { getEventTypeResponse } from "./getEventTypesFromDB";
import type { IsFixedAwareUser, BookingType } from "./types";

type DateRange = {
  start: Dayjs;
  end: Dayjs;
};

const getDateTimeInUtc = (timeInput: string, timeZone?: string) => {
  return timeZone === "Etc/GMT" ? dayjs.utc(timeInput) : dayjs(timeInput).tz(timeZone).utc();
};

const getOriginalBookingDuration = (originalBooking?: BookingType) => {
  return originalBooking
    ? dayjs(originalBooking.endTime).diff(dayjs(originalBooking.startTime), "minutes")
    : undefined;
};

const hasDateRangeForBooking = (
  dateRanges: DateRange[],
  startDateTimeUtc: dayjs.Dayjs,
  endDateTimeUtc: dayjs.Dayjs
) => {
  let dateRangeForBooking = false;

  for (const dateRange of dateRanges) {
    if (
      (startDateTimeUtc.isAfter(dateRange.start) || startDateTimeUtc.isSame(dateRange.start)) &&
      (endDateTimeUtc.isBefore(dateRange.end) || endDateTimeUtc.isSame(dateRange.end))
    ) {
      dateRangeForBooking = true;
      break;
    }
  }

  return dateRangeForBooking;
};

export async function ensureAvailableUsers(
  eventType: getEventTypeResponse & {
    users: IsFixedAwareUser[];
  },
  input: { dateFrom: string; dateTo: string; timeZone: string; originalRescheduledBooking?: BookingType },
  loggerWithEventDetails: Logger<unknown>,
  shouldServeCache?: boolean
  // ReturnType hint of at least one IsFixedAwareUser, as it's made sure at least one entry exists
): Promise<[IsFixedAwareUser, ...IsFixedAwareUser[]]> {
  const availableUsers: IsFixedAwareUser[] = [];

  const startDateTimeUtc = getDateTimeInUtc(input.dateFrom, input.timeZone);
  const endDateTimeUtc = getDateTimeInUtc(input.dateTo, input.timeZone);

  const duration = dayjs(input.dateTo).diff(input.dateFrom, "minute");
  const originalBookingDuration = getOriginalBookingDuration(input.originalRescheduledBooking);

  const bookingLimits = parseBookingLimit(eventType?.bookingLimits);
  const durationLimits = parseDurationLimit(eventType?.durationLimits);

  const busyTimesFromLimitsBookingsAllUsers: Awaited<ReturnType<typeof getBusyTimesForLimitChecks>> =
    eventType && (bookingLimits || durationLimits)
      ? await getBusyTimesForLimitChecks({
          userIds: eventType.users.map((u) => u.id),
          eventTypeId: eventType.id,
          startDate: startDateTimeUtc.format(),
          endDate: endDateTimeUtc.format(),
          rescheduleUid: input.originalRescheduledBooking?.uid ?? null,
          bookingLimits,
          durationLimits,
        })
      : [];

  const usersAvailability = await getUsersAvailability({
    users: eventType.users,
    query: {
      ...input,
      eventTypeId: eventType.id,
      duration: originalBookingDuration,
      returnDateOverrides: false,
      dateFrom: startDateTimeUtc.format(),
      dateTo: endDateTimeUtc.format(),
      beforeEventBuffer: eventType.beforeEventBuffer,
      afterEventBuffer: eventType.afterEventBuffer,
      bypassBusyCalendarTimes: false,
      shouldServeCache,
    },
    initialData: {
      eventType,
      rescheduleUid: input.originalRescheduledBooking?.uid ?? null,
      busyTimesFromLimitsBookings: busyTimesFromLimitsBookingsAllUsers,
    },
  });

  const piiFreeInputDataForLogging = safeStringify({
    startDateTimeUtc,
    endDateTimeUtc,
    ...{
      ...input,
      originalRescheduledBooking: input.originalRescheduledBooking
        ? {
            ...input.originalRescheduledBooking,
            user: input.originalRescheduledBooking?.user
              ? getPiiFreeUser(input.originalRescheduledBooking.user)
              : null,
          }
        : undefined,
    },
  });

  usersAvailability.forEach(({ oooExcludedDateRanges: dateRanges, busy: bufferedBusyTimes }, index) => {
    const user = eventType.users[index];

    loggerWithEventDetails.debug(
      "calendarBusyTimes==>>>",
      JSON.stringify({ bufferedBusyTimes, dateRanges, isRecurringEvent: eventType.recurringEvent })
    );

    if (!dateRanges.length) {
      loggerWithEventDetails.error(
        `User does not have availability at this time.`,
        piiFreeInputDataForLogging
      );
      return;
    }

    //check if event time is within the date range
    if (!hasDateRangeForBooking(dateRanges, startDateTimeUtc, endDateTimeUtc)) {
      loggerWithEventDetails.error(`No date range for booking.`, piiFreeInputDataForLogging);
      return;
    }

    try {
      const foundConflict = checkForConflicts({
        busy: bufferedBusyTimes,
        time: startDateTimeUtc,
        eventLength: duration,
      });
      if (!foundConflict) {
        availableUsers.push(user);
      }
    } catch (error) {
      loggerWithEventDetails.error("Unable set isAvailableToBeBooked. Using true. ", error);
    }
  });

  if (availableUsers.length === 0) {
    loggerWithEventDetails.error(`No available users found.`, piiFreeInputDataForLogging);
    throw new Error(ErrorCode.NoAvailableUsersFound);
  }
  // make sure TypeScript understands availableUsers is at least one.
  return availableUsers.length === 1 ? [availableUsers[0]] : [availableUsers[0], ...availableUsers.slice(1)];
}
