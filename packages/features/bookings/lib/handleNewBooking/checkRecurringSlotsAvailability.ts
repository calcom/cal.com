import type { Logger } from "tslog";



import dayjs from "@calcom/dayjs";
import type { Dayjs } from "@calcom/dayjs";
import { checkForConflicts } from "@calcom/features/bookings/lib/conflictChecker/checkForConflicts";
import { getBusyTimesService } from "@calcom/features/di/containers/BusyTimes";
import { getUserAvailabilityService } from "@calcom/features/di/containers/GetUserAvailability";
import { buildDateRanges } from "@calcom/features/schedules/lib/date-ranges";
import { parseBookingLimit } from "@calcom/lib/intervalLimits/isBookingLimits";
import { parseDurationLimit } from "@calcom/lib/intervalLimits/isDurationLimits";
import { getPiiFreeUser } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";



import { ensureAvailableUsers } from "./ensureAvailableUsers";
import type { getEventTypeResponse } from "./getEventTypesFromDB";
import type { BookingType } from "./originalRescheduledBookingUtils";
import type { IsFixedAwareUser } from "./types";

type DateRange = {
  start: Dayjs;
  end: Dayjs;
};

type TimeSlot = {
  start: string;
  end: string;
};

type SlotAvailabilityResult = {
  slotIndex: number;
  isAvailable: boolean;
  reason?: string;
};

/**
 * Maximum date range in months for using the optimized single-query approach.
 * If the date range exceeds this threshold, we'll use parallel queries for each slot.
 * This prevents performance issues with very large date ranges.
 */
const MAX_DATE_RANGE_FOR_BATCH_QUERY_MONTHS = 3;

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

const checkSlotsInParallel = async (
  eventType: Omit<getEventTypeResponse, "users"> & {
    users: IsFixedAwareUser[];
  },
  timeSlots: TimeSlot[],
  timeZone: string,
  originalRescheduledBooking: BookingType | undefined,
  loggerWithEventDetails: Logger<unknown>,
  shouldServeCache?: boolean
): Promise<SlotAvailabilityResult[]> => {
  loggerWithEventDetails.info(`Checking ${timeSlots.length} slots in parallel due to large date range`);

  const slotChecks = timeSlots.map(async (slot, slotIndex): Promise<SlotAvailabilityResult> => {
    try {
      await ensureAvailableUsers(
        eventType,
        {
          dateFrom: slot.start,
          dateTo: slot.end,
          timeZone,
          originalRescheduledBooking,
        },
        loggerWithEventDetails,
        shouldServeCache
      );

      return {
        slotIndex,
        isAvailable: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error checking availability";
      loggerWithEventDetails.debug(`Slot ${slotIndex} unavailable:`, errorMessage);

      return {
        slotIndex,
        isAvailable: false,
        reason: errorMessage,
      };
    }
  });

  const results = await Promise.all(slotChecks);

  return results.sort((a, b) => a.slotIndex - b.slotIndex);
};

/**
 * Check availability for multiple time slots with a single API call.
 * Fetches busy times for the entire date range once, then checks each slot against those busy times.
 */
export const checkRecurringSlotsAvailability = async (
  eventType: Omit<getEventTypeResponse, "users"> & {
    users: IsFixedAwareUser[];
  },
  input: {
    timeSlots: TimeSlot[];
    timeZone: string;
    originalRescheduledBooking?: BookingType;
  },
  loggerWithEventDetails: Logger<unknown>,
  shouldServeCache?: boolean
): Promise<SlotAvailabilityResult[]> => {
  const { timeSlots, timeZone, originalRescheduledBooking } = input;

  if (timeSlots.length === 0) {
    return [];
  }

  // Calculate min and max times for the entire range
  const startTimes = timeSlots.map((slot) => dayjs(slot.start).tz(timeZone));
  const endTimes = timeSlots.map((slot) => dayjs(slot.end).tz(timeZone));

  const minStartTime = dayjs.min(startTimes);
  const maxEndTime = dayjs.max(endTimes);

  const startDateTimeUtc = getDateTimeInUtc(minStartTime.format(), timeZone);
  const endDateTimeUtc = getDateTimeInUtc(maxEndTime.format(), timeZone);

  const dateRangeDiffInMonths = endDateTimeUtc.diff(startDateTimeUtc, "months", true);
  const shouldUseParallelQueries = dateRangeDiffInMonths > MAX_DATE_RANGE_FOR_BATCH_QUERY_MONTHS;

  loggerWithEventDetails.debug(
    `Date range: ${dateRangeDiffInMonths.toFixed(2)} months. Using ${
      shouldUseParallelQueries ? "parallel" : "batch"
    } query approach.`
  );

  // If date range is too large, use parallel queries for each slot
  if (shouldUseParallelQueries) {
    return await checkSlotsInParallel(
      eventType,
      timeSlots,
      timeZone,
      originalRescheduledBooking,
      loggerWithEventDetails,
      shouldServeCache
    );
  }

  const originalBookingDuration = getOriginalBookingDuration(originalRescheduledBooking);

  const bookingLimits = parseBookingLimit(eventType?.bookingLimits);
  const durationLimits = parseDurationLimit(eventType?.durationLimits);

  // Fetch busy times once for the entire range
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
          rescheduleUid: originalRescheduledBooking?.uid ?? null,
          bookingLimits,
          durationLimits,
        })
      : [];

  const userAvailabilityService = getUserAvailabilityService();
  const usersAvailability = await userAvailabilityService.getUsersAvailability({
    users: eventType.users,
    query: {
      dateFrom: startDateTimeUtc.format(),
      dateTo: endDateTimeUtc.format(),
      eventTypeId: eventType.id,
      duration: originalBookingDuration,
      returnDateOverrides: false,
      beforeEventBuffer: eventType.beforeEventBuffer,
      afterEventBuffer: eventType.afterEventBuffer,
      bypassBusyCalendarTimes: false,
      shouldServeCache,
      withSource: true,
    },
    initialData: {
      eventType,
      rescheduleUid: originalRescheduledBooking?.uid ?? null,
      busyTimesFromLimitsBookings: busyTimesFromLimitsBookingsAllUsers,
    },
  });

  const piiFreeInputDataForLogging = safeStringify({
    startDateTimeUtc,
    endDateTimeUtc,
    timeZone,
    numSlots: timeSlots.length,
    originalRescheduledBooking: originalRescheduledBooking
      ? {
          ...originalRescheduledBooking,
          user: originalRescheduledBooking?.user ? getPiiFreeUser(originalRescheduledBooking.user) : null,
        }
      : undefined,
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
        return timeSlots.map((_, index) => ({
          slotIndex: index,
          isAvailable: false,
          reason: "Restriction schedule not found",
        }));
      }

      const restrictionTimezone = eventType.useBookerTimezone ? timeZone : restrictionSchedule.timeZone!;

      if (!eventType.useBookerTimezone && !restrictionSchedule.timeZone) {
        loggerWithEventDetails.error(
          `No timezone is set for the restriction schedule and useBookerTimezone is false`
        );
        return timeSlots.map((_, index) => ({
          slotIndex: index,
          isAvailable: false,
          reason: "No timezone set for restriction schedule",
        }));
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

      const results: SlotAvailabilityResult[] = [];
      for (let i = 0; i < timeSlots.length; i++) {
        const slot = timeSlots[i];
        const slotStartUtc = getDateTimeInUtc(slot.start, timeZone);
        const slotEndUtc = getDateTimeInUtc(slot.end, timeZone);

        if (!hasDateRangeForBooking(restrictionRanges, slotStartUtc, slotEndUtc)) {
          results.push({
            slotIndex: i,
            isAvailable: false,
            reason: "Outside restriction schedule availability",
          });
        } else {
          results.push({ slotIndex: i, isAvailable: true });
        }
      }

      const restrictionFailedSlots = results.filter((r) => !r.isAvailable);
      if (restrictionFailedSlots.length === timeSlots.length) {
        return results;
      }
    } catch {
      loggerWithEventDetails.error(`Error checking restriction schedule.`, piiFreeInputDataForLogging);
      return timeSlots.map((_, index) => ({
        slotIndex: index,
        isAvailable: false,
        reason: "Error checking restriction schedule",
      }));
    }
  }

  const results: SlotAvailabilityResult[] = [];

  for (let slotIndex = 0; slotIndex < timeSlots.length; slotIndex++) {
    const slot = timeSlots[slotIndex];
    const slotStartUtc = getDateTimeInUtc(slot.start, timeZone);
    const slotEndUtc = getDateTimeInUtc(slot.end, timeZone);
    const duration = dayjs(slot.end).diff(slot.start, "minute");

    let allUsersAvailable = true;
    let unavailableReason: string | undefined;

    for (let userIndex = 0; userIndex < eventType.users.length; userIndex++) {
      const user = eventType.users[userIndex];
      const userAvailability = usersAvailability[userIndex];

      if (!userAvailability) {
        allUsersAvailable = false;
        unavailableReason = `No availability data for user ${user.id}`;
        break;
      }

      const { oooExcludedDateRanges: dateRanges, busy: bufferedBusyTimes } = userAvailability;

      loggerWithEventDetails.debug(
        `Checking slot ${slotIndex} for user ${user.id}`,
        JSON.stringify({ slotStart: slot.start, slotEnd: slot.end })
      );

      if (!dateRanges.length) {
        allUsersAvailable = false;
        unavailableReason = `User ${user.id} does not have availability at this time`;
        break;
      }

      if (!hasDateRangeForBooking(dateRanges, slotStartUtc, slotEndUtc)) {
        allUsersAvailable = false;
        unavailableReason = `No date range for booking for user ${user.id}`;
        break;
      }

      try {
        const foundConflict = checkForConflicts({
          busy: bufferedBusyTimes,
          time: slotStartUtc,
          eventLength: duration,
        });

        if (foundConflict) {
          allUsersAvailable = false;
          unavailableReason = `User ${user.id} has a conflict`;
          break;
        }
      } catch {
        loggerWithEventDetails.error(`Error checking conflicts for user ${user.id} at slot ${slotIndex}`);
        allUsersAvailable = false;
        unavailableReason = `Error checking conflicts for user ${user.id}`;
        break;
      }
    }

    results.push({
      slotIndex,
      isAvailable: allUsersAvailable,
      reason: unavailableReason,
    });
  }

  return results;
};