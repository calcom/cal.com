import type { Logger } from "tslog";

import dayjs from "@calcom/dayjs";
import type { Dayjs } from "@calcom/dayjs";
import { checkForConflicts } from "@calcom/features/bookings/lib/conflictChecker/checkForConflicts";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { getBusyTimesService } from "@calcom/features/di/containers/BusyTimes";
import { getUserAvailabilityService } from "@calcom/features/di/containers/GetUserAvailability";
import { buildDateRanges } from "@calcom/features/schedules/lib/date-ranges";
import { descendingLimitKeys, intervalLimitKeyToUnit } from "@calcom/lib/intervalLimits/intervalLimit";
import LimitManager from "@calcom/lib/intervalLimits/limitManager";
import { isBookingWithinPeriod } from "@calcom/lib/intervalLimits/utils";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { parseBookingLimit } from "@calcom/lib/intervalLimits/isBookingLimits";
import { parseDurationLimit } from "@calcom/lib/intervalLimits/isDurationLimits";
import { getPiiFreeUser } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import { withReporting } from "@calcom/lib/sentryWrapper";
import prisma from "@calcom/prisma";
import type { EventBusyDetails } from "@calcom/types/Calendar";

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
  shouldServeCache?: boolean
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

  const teamForBookingLimits =
    eventType?.team ??
    (eventType?.parent?.team?.includeManagedEventsInLimits ? eventType?.parent?.team : null);

  const teamBookingLimits = parseBookingLimit(teamForBookingLimits?.bookingLimits);

  let teamBookingLimitsMap: Map<number, EventBusyDetails[]> | undefined = undefined;
  if (teamForBookingLimits && teamBookingLimits) {
    const usersForTeamLimits = eventType.users.map((user) => ({ id: user.id, email: user.email }));
    const eventTimeZone = eventType.schedule?.timeZone ?? input.timeZone;

    const { limitDateFrom, limitDateTo } = busyTimesService.getStartEndDateforLimitCheck(
      startDateTimeUtc.toISOString(),
      endDateTimeUtc.toISOString(),
      teamBookingLimits
    );

    const bookingRepo = new BookingRepository(prisma);
    const bookings = await bookingRepo.getAllAcceptedTeamBookingsOfUsers({
      users: usersForTeamLimits,
      teamId: teamForBookingLimits.id,
      startDate: limitDateFrom.toDate(),
      endDate: limitDateTo.toDate(),
      excludedUid: input.originalRescheduledBooking?.uid,
      includeManagedEvents: teamForBookingLimits.includeManagedEventsInLimits,
    });

    const busyTimes = bookings.map(({ id, startTime, endTime, eventTypeId, title, userId }) => ({
      start: dayjs(startTime).toDate(),
      end: dayjs(endTime).toDate(),
      title,
      source: `eventType-${eventTypeId}-booking-${id}`,
      userId,
    }));

    teamBookingLimitsMap = new Map();

    for (const user of usersForTeamLimits) {
      const userBusyTimes = busyTimes.filter((busyTime) => busyTime.userId === user.id);
      const limitManager = new LimitManager();

      for (const key of descendingLimitKeys) {
        const limit = teamBookingLimits?.[key];
        if (!limit) continue;

        const unit = intervalLimitKeyToUnit(key);
        const periodStartDates: Dayjs[] = [];

        let currentDate = startDateTimeUtc.tz(eventTimeZone);
        const endDate = endDateTimeUtc.tz(eventTimeZone);

        while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, unit)) {
          periodStartDates.push(currentDate.startOf(unit));
          currentDate = currentDate.add(1, unit);
        }

        for (const periodStart of periodStartDates) {
          if (limitManager.isAlreadyBusy(periodStart, unit, eventTimeZone)) continue;

          const periodEnd = periodStart.endOf(unit);
          let totalBookings = 0;

          for (const booking of userBusyTimes) {
            if (!isBookingWithinPeriod(booking, periodStart, periodEnd, eventTimeZone)) {
              continue;
            }

            totalBookings++;
            if (totalBookings >= limit) {
              limitManager.addBusyTime(periodStart, unit, eventTimeZone);
              break;
            }
          }
        }
      }

      teamBookingLimitsMap.set(user.id, limitManager.getBusyTimes());
    }
  }

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
      shouldServeCache,
      withSource: true,
    },
    initialData: {
      eventType,
      rescheduleUid: input.originalRescheduledBooking?.uid ?? null,
      busyTimesFromLimitsBookings: busyTimesFromLimitsBookingsAllUsers,
      teamBookingLimits: teamBookingLimitsMap,
      teamForBookingLimits: teamForBookingLimits,
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
              startDate: dayjs(schedule.startDate),
              endDate: schedule.endDate ? dayjs(schedule.endDate) : undefined,
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

      if (!hasDateRangeForBooking(restrictionRanges, startDateTimeUtc, endDateTimeUtc)) {
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

  usersAvailability.forEach((userAvailability, index) => {
    const { oooExcludedDateRanges: dateRanges, busy: bufferedBusyTimes } = userAvailability;
    const user = eventType.users[index];

    loggerWithEventDetails.debug(
      "calendarBusyTimes==>>>",
      JSON.stringify({ bufferedBusyTimes, dateRanges, isRecurringEvent: eventType.recurringEvent })
    );

    if (!dateRanges.length) {
      loggerWithEventDetails.error(
        `User ${user.id} does not have availability at this time.`,
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
        availableUsers.push({ ...user, availabilityData: userAvailability });
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
