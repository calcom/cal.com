import type { Logger } from "tslog";

import dayjs from "@calcom/dayjs";
import type { Dayjs } from "@calcom/dayjs";
import { checkForConflicts } from "@calcom/features/bookings/lib/conflictChecker/checkForConflicts";
import { getBusyTimesService } from "@calcom/features/di/containers/BusyTimes";
import { getUserAvailabilityService } from "@calcom/features/di/containers/GetUserAvailability";
import { buildDateRanges } from "@calcom/features/schedules/lib/date-ranges";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { parseBookingLimit } from "@calcom/lib/intervalLimits/isBookingLimits";
import { parseDurationLimit } from "@calcom/lib/intervalLimits/isDurationLimits";
import { getPiiFreeUser } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import { withReporting } from "@calcom/lib/sentryWrapper";
import prisma from "@calcom/prisma";
import type { CalendarFetchMode } from "@calcom/types/Calendar";

import type { getEventTypeResponse } from "./getEventTypesFromDB";
import type { BookingType } from "./originalRescheduledBookingUtils";
import type { IsFixedAwareUser } from "./types";

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

const _ensureAvailableUsers = async (
  eventType: Omit<getEventTypeResponse, "users"> & {
    users: IsFixedAwareUser[];
  },
  input: { dateFrom: string; dateTo: string; timeZone: string; originalRescheduledBooking?: BookingType },
  loggerWithEventDetails: Logger<unknown>,
  mode?: CalendarFetchMode
  // ReturnType hint of at least one IsFixedAwareUser, as it's made sure at least one entry exists
): Promise<[IsFixedAwareUser, ...IsFixedAwareUser[]]> => {
  const userAvailabilityService = getUserAvailabilityService();
  const availableUsers: IsFixedAwareUser[] = [];

  const startDateTimeUtc = getDateTimeInUtc(input.dateFrom, input.timeZone);
  const endDateTimeUtc = getDateTimeInUtc(input.dateTo, input.timeZone);

  const duration = dayjs(input.dateTo).diff(input.dateFrom, "minute");
  const originalBookingDuration = getOriginalBookingDuration(input.originalRescheduledBooking);

  const bookingLimits = parseBookingLimit(eventType?.bookingLimits);
  const durationLimits = parseDurationLimit(eventType?.durationLimits);

  const busyTimesService = getBusyTimesService();
  const busyTimesFromLimitsBookingsAllUsers: Awaited<
    ReturnType<typeof busyTimesService.getBusyTimesForLimitChecks>
  > =
    eventType && (bookingLimits || durationLimits)
      ? await busyTimesService.getBusyTimesForLimitChecks({
          userIds: eventType.users.map((u) => u.id),
          eventTypeId: eventType.id,
          startDate: startDateTimeUtc.format(),
          endDate: endDateTimeUtc.format(),
          rescheduleUid: input.originalRescheduledBooking?.uid ?? null,
          bookingLimits,
          durationLimits,
        })
      : [];

  const usersAvailability = await userAvailabilityService.getUsersAvailability({
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
      mode,
      withSource: true,
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
        : restrictionSchedule.timeZone;

      const restrictionDateRanges = buildDateRanges({
        availability: restrictionSchedule.availability,
        dateFrom: startDateTimeUtc.format(),
        dateTo: endDateTimeUtc.format(),
        timeZone: restrictionTimezone,
      });

      if (!hasDateRangeForBooking(restrictionDateRanges, startDateTimeUtc, endDateTimeUtc)) {
        loggerWithEventDetails.error(
          `Booking not in restriction schedule ${eventType.restrictionScheduleId}`,
          piiFreeInputDataForLogging
        );
        throw new Error(ErrorCode.RestrictionScheduleNotMatched);
      }
    } catch (error) {
      loggerWithEventDetails.error(
        `Error checking restriction schedule ${eventType.restrictionScheduleId}`,
        error,
        piiFreeInputDataForLogging
      );
      throw error;
    }
  }

  // Check if all users are available for the selected time slot
  const hasAllUsersAvailable = usersAvailability.every((user) => user.available);

  if (!hasAllUsersAvailable) {
    loggerWithEventDetails.error(
      "Not all users are available for the selected time slot",
      piiFreeInputDataForLogging
    );
    throw new Error(ErrorCode.UserNotAvailable);
  }

  return usersAvailability.filter((user) => user.available) as [IsFixedAwareUser, ...IsFixedAwareUser[]];
};

export default _ensureAvailableUsers;