import type { Logger } from "tslog";

import dayjs from "@calcom/dayjs";
import type { Dayjs } from "@calcom/dayjs";
import { checkForConflicts } from "@calcom/features/bookings/lib/conflictChecker/checkForConflicts";
import {
  getRoundRobinHostLimitOverrides,
  groupRoundRobinHostsByEffectiveLimits,
} from "@calcom/features/bookings/lib/handleNewBooking/resolveRoundRobinHostEffectiveLimits";
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
import { SchedulingType } from "@calcom/prisma/enums";
import type { CalendarFetchMode } from "@calcom/types/Calendar";
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

const getEventLevelLimits = (
  eventType: Pick<
    getEventTypeResponse,
    | "minimumBookingNotice"
    | "beforeEventBuffer"
    | "afterEventBuffer"
    | "slotInterval"
    | "bookingLimits"
    | "durationLimits"
    | "periodType"
    | "periodDays"
    | "periodCountCalendarDays"
    | "periodStartDate"
    | "periodEndDate"
  >
) => ({
  minimumBookingNotice: eventType.minimumBookingNotice,
  beforeEventBuffer: eventType.beforeEventBuffer,
  afterEventBuffer: eventType.afterEventBuffer,
  slotInterval: eventType.slotInterval,
  bookingLimits: eventType.bookingLimits,
  durationLimits: eventType.durationLimits,
  periodType: eventType.periodType,
  periodDays: eventType.periodDays,
  periodCountCalendarDays: eventType.periodCountCalendarDays,
  periodStartDate: eventType.periodStartDate,
  periodEndDate: eventType.periodEndDate,
});

const buildEventTypeWithEffectiveLimits = ({
  eventType,
  effectiveLimits,
}: {
  eventType: Omit<getEventTypeResponse, "users"> & {
    users: IsFixedAwareUser[];
  };
  effectiveLimits: ReturnType<typeof getEventLevelLimits>;
}) => ({
  ...eventType,
  minimumBookingNotice: effectiveLimits.minimumBookingNotice,
  beforeEventBuffer: effectiveLimits.beforeEventBuffer,
  afterEventBuffer: effectiveLimits.afterEventBuffer,
  slotInterval: effectiveLimits.slotInterval,
  bookingLimits: effectiveLimits.bookingLimits,
  durationLimits: effectiveLimits.durationLimits,
  periodType: effectiveLimits.periodType,
  periodDays: effectiveLimits.periodDays,
  periodCountCalendarDays: effectiveLimits.periodCountCalendarDays,
  periodStartDate: effectiveLimits.periodStartDate,
  periodEndDate: effectiveLimits.periodEndDate,
});

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
  const hasRoundRobinHostLimitOverrides =
    eventType.schedulingType === SchedulingType.ROUND_ROBIN &&
    eventType.users.some((user) => getRoundRobinHostLimitOverrides(user));

  const busyTimesService = getBusyTimesService();
  const busyTimesFromLimitsBookingsAllUsers: Awaited<
    ReturnType<typeof busyTimesService.getBusyTimesForLimitChecks>
  > =
    !hasRoundRobinHostLimitOverrides && eventType && (bookingLimits || durationLimits)
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

  const usersAvailability = hasRoundRobinHostLimitOverrides
    ? await (async () => {
        const eventLevelLimits = getEventLevelLimits(eventType);
        const limitBuckets = groupRoundRobinHostsByEffectiveLimits({
          schedulingType: eventType.schedulingType,
          eventLimits: eventLevelLimits,
          hosts: eventType.users,
          getHostOverrides: getRoundRobinHostLimitOverrides,
        });
        const effectiveLimitsByUserId = new Map<number, typeof eventLevelLimits>();
        const busyTimesFromLimitsByUserId = new Map<number, EventBusyDetails[]>();

        for (const bucket of limitBuckets) {
          const parsedBucketBookingLimits = parseBookingLimit(bucket.effectiveLimits.bookingLimits);
          const parsedBucketDurationLimits = parseDurationLimit(bucket.effectiveLimits.durationLimits);

          let bucketBookings: EventBusyDetails[] = [];
          if (parsedBucketBookingLimits || parsedBucketDurationLimits) {
            const { limitDateFrom, limitDateTo } = busyTimesService.getStartEndDateforLimitCheck(
              startDateTimeUtc.toISOString(),
              endDateTimeUtc.toISOString(),
              parsedBucketBookingLimits,
              parsedBucketDurationLimits
            );

            bucketBookings = await busyTimesService.getBusyTimesForLimitChecks({
              userIds: bucket.hosts.map((user) => user.id),
              eventTypeId: eventType.id,
              startDate: limitDateFrom.format(),
              endDate: limitDateTo.format(),
              rescheduleUid: input.originalRescheduledBooking?.uid ?? null,
              bookingLimits: parsedBucketBookingLimits,
              durationLimits: parsedBucketDurationLimits,
            });
          }

          for (const user of bucket.hosts) {
            effectiveLimitsByUserId.set(user.id, bucket.effectiveLimits);
            busyTimesFromLimitsByUserId.set(
              user.id,
              bucketBookings.filter((booking) => booking.userId === user.id)
            );
          }
        }

        return await Promise.all(
          eventType.users.map(async (user) => {
            const effectiveLimits = effectiveLimitsByUserId.get(user.id) ?? eventLevelLimits;
            return await userAvailabilityService.getUserAvailability(
              {
                ...input,
                eventTypeId: eventType.id,
                duration: originalBookingDuration,
                returnDateOverrides: false,
                dateFrom: startDateTimeUtc,
                dateTo: endDateTimeUtc,
                beforeEventBuffer: effectiveLimits.beforeEventBuffer,
                afterEventBuffer: effectiveLimits.afterEventBuffer,
                bypassBusyCalendarTimes: false,
                mode,
                withSource: true,
              },
              {
                user,
                eventType: buildEventTypeWithEffectiveLimits({ eventType, effectiveLimits }),
                rescheduleUid: input.originalRescheduledBooking?.uid ?? null,
                busyTimesFromLimitsBookings: busyTimesFromLimitsByUserId.get(user.id) ?? [],
              }
            );
          })
        );
      })()
    : await userAvailabilityService.getUsersAvailability({
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
