import type { Logger } from "tslog";

import { checkForConflicts } from "@calcom/features/bookings/lib/conflictChecker/checkForConflicts";
import { buildDateRanges, type DateRange } from "@calcom/lib/date-ranges";
import { isBefore, isAfter, toISOString, utc, tz, diff } from "@calcom/lib/dateFns";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { getBusyTimesForLimitChecks } from "@calcom/lib/getBusyTimes";
import { getUsersAvailability } from "@calcom/lib/getUserAvailability";
import { parseBookingLimit } from "@calcom/lib/intervalLimits/isBookingLimits";
import { parseDurationLimit } from "@calcom/lib/intervalLimits/isDurationLimits";
import { getPiiFreeUser } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import { withReporting } from "@calcom/lib/sentryWrapper";
import prisma from "@calcom/prisma";

import type { getEventTypeResponse } from "./getEventTypesFromDB";
import type { BookingType } from "./originalRescheduledBookingUtils";
import type { IsFixedAwareUser } from "./types";

const getDateTimeInUtc = (timeInput: string, timeZone?: string) => {
  if (timeInput.includes("+") || timeInput.includes("Z")) {
    return utc(timeInput);
  }
  return timeZone === "Etc/GMT" ? utc(timeInput) : utc(tz(new Date(timeInput), timeZone || "UTC"));
};

const getOriginalBookingDuration = (originalBooking?: BookingType) => {
  return originalBooking
    ? diff(new Date(originalBooking.endTime), new Date(originalBooking.startTime), "minute")
    : undefined;
};

const hasDateRangeForBooking = (dateRanges: DateRange[], startDateTimeUtc: Date, endDateTimeUtc: Date) => {
  let dateRangeForBooking = false;

  for (const dateRange of dateRanges) {
    if (
      (isAfter(startDateTimeUtc, dateRange.start) ||
        startDateTimeUtc.getTime() === dateRange.start.getTime()) &&
      (isBefore(endDateTimeUtc, dateRange.end) || endDateTimeUtc.getTime() === dateRange.end.getTime())
    ) {
      dateRangeForBooking = true;
      break;
    }
  }

  return dateRangeForBooking;
};

const _ensureAvailableUsers = async (
  eventType: Omit<getEventTypeResponse, "users"> & {
    users: IsFixedAwareUser[];
  },
  input: { dateFrom: string; dateTo: string; timeZone: string; originalRescheduledBooking?: BookingType },
  loggerWithEventDetails: Logger<unknown>,
  shouldServeCache?: boolean
  // ReturnType hint of at least one IsFixedAwareUser, as it's made sure at least one entry exists
): Promise<[IsFixedAwareUser, ...IsFixedAwareUser[]]> => {
  const availableUsers: IsFixedAwareUser[] = [];

  const startDateTimeUtc = getDateTimeInUtc(input.dateFrom, input.timeZone);
  const endDateTimeUtc = getDateTimeInUtc(input.dateTo, input.timeZone);

  const duration = diff(new Date(input.dateTo), new Date(input.dateFrom), "minute");
  const originalBookingDuration = getOriginalBookingDuration(input.originalRescheduledBooking);

  const bookingLimits = parseBookingLimit(eventType?.bookingLimits);
  const durationLimits = parseDurationLimit(eventType?.durationLimits);

  const busyTimesFromLimitsBookingsAllUsers: Awaited<ReturnType<typeof getBusyTimesForLimitChecks>> =
    eventType && (bookingLimits || durationLimits)
      ? await getBusyTimesForLimitChecks({
          userIds: eventType.users.map((u) => u.id),
          eventTypeId: eventType.id,
          startDate: toISOString(startDateTimeUtc),
          endDate: toISOString(endDateTimeUtc),
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
      dateFrom: toISOString(startDateTimeUtc),
      dateTo: toISOString(endDateTimeUtc),
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

  if (eventType.restrictionScheduleId) {
    try {
      const restrictionSchedule = await prisma.schedule.findUnique({
        where: { id: eventType.restrictionScheduleId },
        select: {
          id: true,
          timeZone: true,
          userId: true,
          availability: {
            select: {
              days: true,
              startTime: true,
              endTime: true,
              date: true,
            },
          },
          user: {
            select: {
              id: true,
              defaultScheduleId: true,
              travelSchedules: {
                select: {
                  id: true,
                  timeZone: true,
                  startDate: true,
                  endDate: true,
                },
              },
            },
          },
        },
      });

      if (!restrictionSchedule) {
        loggerWithEventDetails.error(`Restriction schedule ${eventType.restrictionScheduleId} not found`);
        throw new Error(ErrorCode.RestrictionScheduleNotFound);
      }

      const restrictionTimezone = eventType.useBookerTimezone
        ? input.timeZone
        : restrictionSchedule.timeZone!;

      if (!eventType.useBookerTimezone && !restrictionSchedule.timeZone) {
        loggerWithEventDetails.error(
          `No timezone is set for the restriction schedule and useBookerTimezone is false`
        );
        throw new Error(ErrorCode.BookingNotAllowedByRestrictionSchedule);
      }

      const restrictionAvailability = restrictionSchedule.availability.map((rule) => ({
        days: rule.days,
        startTime: rule.startTime,
        endTime: rule.endTime,
        date: rule.date,
      }));

      const isDefaultSchedule = restrictionSchedule.user.defaultScheduleId === restrictionSchedule.id;
      const travelSchedules =
        isDefaultSchedule && !eventType.useBookerTimezone
          ? restrictionSchedule.user.travelSchedules.map((schedule) => ({
              startDate: new Date(schedule.startDate),
              endDate: schedule.endDate ? new Date(schedule.endDate) : undefined,
              timeZone: schedule.timeZone,
            }))
          : [];

      const { dateRanges: restrictionRanges } = buildDateRanges({
        availability: restrictionAvailability,
        timeZone: restrictionTimezone,
        dateFrom: startDateTimeUtc,
        dateTo: endDateTimeUtc,
        travelSchedules,
      });

      if (!hasDateRangeForBooking(restrictionRanges, new Date(startDateTimeUtc), new Date(endDateTimeUtc))) {
        loggerWithEventDetails.error(
          `Booking outside restriction schedule availability.`,
          piiFreeInputDataForLogging
        );
        throw new Error(ErrorCode.BookingNotAllowedByRestrictionSchedule);
      }
    } catch (error) {
      loggerWithEventDetails.error(`Error checking restriction schedule.`, piiFreeInputDataForLogging);
      throw error;
    }
  }

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
    const hasRange = hasDateRangeForBooking(dateRanges, new Date(startDateTimeUtc), new Date(endDateTimeUtc));
    if (!hasRange) {
      loggerWithEventDetails.error(`No date range for booking.`, piiFreeInputDataForLogging);
      return;
    }

    try {
      const foundConflict = checkForConflicts({
        busy: bufferedBusyTimes,
        time: new Date(startDateTimeUtc),
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
};

export const ensureAvailableUsers = withReporting(_ensureAvailableUsers, "ensureAvailableUsers");
