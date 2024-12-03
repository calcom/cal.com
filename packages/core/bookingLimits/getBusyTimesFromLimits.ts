import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { descendingLimitKeys, intervalLimitKeyToUnit } from "@calcom/lib/intervalLimit";
import { checkBookingLimit } from "@calcom/lib/server";
import { performance } from "@calcom/lib/server/perfObserver";
import { getTotalBookingDuration } from "@calcom/lib/server/queries";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import type { EventBusyDetails, IntervalLimit } from "@calcom/types/Calendar";

import { getStartEndDateforLimitCheck } from "../getBusyTimes";
import type { EventType } from "../getUserAvailability";
import { getPeriodStartDatesBetween } from "../getUserAvailability";
import monitorCallbackAsync from "../sentryWrapper";
import LimitManager from "./limitManager";

export const getBusyTimesFromLimits = async (
  ...args: Parameters<typeof _getBusyTimesFromLimits>
): Promise<ReturnType<typeof _getBusyTimesFromLimits>> => {
  return monitorCallbackAsync(_getBusyTimesFromLimits, ...args);
};

const _getBusyTimesFromLimits = async (
  bookingLimits: IntervalLimit | null,
  durationLimits: IntervalLimit | null,
  dateFrom: Dayjs,
  dateTo: Dayjs,
  duration: number | undefined,
  eventType: NonNullable<EventType>,
  bookings: EventBusyDetails[],
  timeZone: string,
  rescheduleUid?: string
) => {
  performance.mark("limitsStart");

  // shared amongst limiters to prevent processing known busy periods
  const limitManager = new LimitManager();

  // run this first, as counting bookings should always run faster..
  if (bookingLimits) {
    performance.mark("bookingLimitsStart");
    await getBusyTimesFromBookingLimits({
      bookings,
      bookingLimits,
      dateFrom,
      dateTo,
      eventTypeId: eventType.id,
      limitManager,
      rescheduleUid,
      timeZone,
    });
    performance.mark("bookingLimitsEnd");
    performance.measure(`checking booking limits took $1'`, "bookingLimitsStart", "bookingLimitsEnd");
  }

  // ..than adding up durations (especially for the whole year)
  if (durationLimits) {
    performance.mark("durationLimitsStart");
    await getBusyTimesFromDurationLimits(
      bookings,
      durationLimits,
      dateFrom,
      dateTo,
      duration,
      eventType,
      limitManager,
      rescheduleUid
    );
    performance.mark("durationLimitsEnd");
    performance.measure(`checking duration limits took $1'`, "durationLimitsStart", "durationLimitsEnd");
  }

  performance.mark("limitsEnd");
  performance.measure(`checking all limits took $1'`, "limitsStart", "limitsEnd");

  return limitManager.getBusyTimes();
};

const getBusyTimesFromBookingLimits = async (
  ...args: Parameters<typeof _getBusyTimesFromBookingLimits>
): Promise<ReturnType<typeof _getBusyTimesFromBookingLimits>> => {
  return monitorCallbackAsync(_getBusyTimesFromBookingLimits, ...args);
};

const _getBusyTimesFromBookingLimits = async (params: {
  bookings: EventBusyDetails[];
  bookingLimits: IntervalLimit;
  dateFrom: Dayjs;
  dateTo: Dayjs;
  limitManager: LimitManager;
  rescheduleUid?: string;
  eventTypeId?: number;
  teamId?: number;
  user?: { id: number; email: string };
  includeManagedEvents?: boolean;
  timeZone?: string | null;
}) => {
  const {
    bookings,
    bookingLimits,
    dateFrom,
    dateTo,
    limitManager,
    eventTypeId,
    teamId,
    user,
    rescheduleUid,
    includeManagedEvents = false,
    timeZone,
  } = params;

  for (const key of descendingLimitKeys) {
    const limit = bookingLimits?.[key];
    if (!limit) continue;

    const unit = intervalLimitKeyToUnit(key);
    const periodStartDates = getPeriodStartDatesBetween(dateFrom, dateTo, unit);

    for (const periodStart of periodStartDates) {
      if (limitManager.isAlreadyBusy(periodStart, unit)) continue;

      // special handling of yearly limits to improve performance
      if (unit === "year") {
        try {
          await checkBookingLimit({
            eventStartDate: periodStart.toDate(),
            limitingNumber: limit,
            eventId: eventTypeId,
            key,
            teamId,
            user,
            rescheduleUid,
            includeManagedEvents,
            timeZone,
          });
        } catch (_) {
          limitManager.addBusyTime(periodStart, unit);
          if (periodStartDates.every((start) => limitManager.isAlreadyBusy(start, unit))) {
            return;
          }
        }
        continue;
      }

      const periodEnd = periodStart.endOf(unit);
      let totalBookings = 0;

      for (const booking of bookings) {
        // consider booking part of period independent of end date
        if (!dayjs(booking.start).isBetween(periodStart, periodEnd)) {
          continue;
        }
        totalBookings++;
        if (totalBookings >= limit) {
          limitManager.addBusyTime(periodStart, unit);
          break;
        }
      }
    }
  }
};

const getBusyTimesFromDurationLimits = async (
  ...args: Parameters<typeof _getBusyTimesFromDurationLimits>
): Promise<ReturnType<typeof _getBusyTimesFromDurationLimits>> => {
  return monitorCallbackAsync(_getBusyTimesFromDurationLimits, ...args);
};

const _getBusyTimesFromDurationLimits = async (
  bookings: EventBusyDetails[],
  durationLimits: IntervalLimit,
  dateFrom: Dayjs,
  dateTo: Dayjs,
  duration: number | undefined,
  eventType: NonNullable<EventType>,
  limitManager: LimitManager,
  rescheduleUid?: string
) => {
  for (const key of descendingLimitKeys) {
    const limit = durationLimits?.[key];
    if (!limit) continue;

    const unit = intervalLimitKeyToUnit(key);
    const periodStartDates = getPeriodStartDatesBetween(dateFrom, dateTo, unit);

    for (const periodStart of periodStartDates) {
      if (limitManager.isAlreadyBusy(periodStart, unit)) continue;

      const selectedDuration = (duration || eventType.length) ?? 0;

      if (selectedDuration > limit) {
        limitManager.addBusyTime(periodStart, unit);
        continue;
      }

      // special handling of yearly limits to improve performance
      if (unit === "year") {
        const totalYearlyDuration = await getTotalBookingDuration({
          eventId: eventType.id,
          startDate: periodStart.toDate(),
          endDate: periodStart.endOf(unit).toDate(),
          rescheduleUid,
        });
        if (totalYearlyDuration + selectedDuration > limit) {
          limitManager.addBusyTime(periodStart, unit);
          if (periodStartDates.every((start) => limitManager.isAlreadyBusy(start, unit))) {
            return;
          }
        }
        continue;
      }

      const periodEnd = periodStart.endOf(unit);
      let totalDuration = selectedDuration;

      for (const booking of bookings) {
        // consider booking part of period independent of end date
        if (!dayjs(booking.start).isBetween(periodStart, periodEnd)) {
          continue;
        }
        totalDuration += dayjs(booking.end).diff(dayjs(booking.start), "minute");
        if (totalDuration > limit) {
          limitManager.addBusyTime(periodStart, unit);
          break;
        }
      }
    }
  }
};

export const getBusyTimesFromTeamLimits = async (
  ...args: Parameters<typeof _getBusyTimesFromTeamLimits>
): Promise<ReturnType<typeof _getBusyTimesFromTeamLimits>> => {
  return monitorCallbackAsync(_getBusyTimesFromTeamLimits, ...args);
};

const _getBusyTimesFromTeamLimits = async (
  user: { id: number; email: string },
  bookingLimits: IntervalLimit,
  dateFrom: Dayjs,
  dateTo: Dayjs,
  teamId: number,
  includeManagedEvents: boolean,
  timeZone: string,
  rescheduleUid?: string
) => {
  const { limitDateFrom, limitDateTo } = getStartEndDateforLimitCheck(
    dateFrom.toISOString(),
    dateTo.toISOString(),
    bookingLimits
  );

  const bookings = await BookingRepository.getAllAcceptedTeamBookingsOfUser({
    user,
    teamId,
    startDate: limitDateFrom.toDate(),
    endDate: limitDateTo.toDate(),
    excludedUid: rescheduleUid,
    includeManagedEvents,
  });

  const busyTimes = bookings.map(({ id, startTime, endTime, eventTypeId, title, userId }) => ({
    start: dayjs(startTime).toDate(),
    end: dayjs(endTime).toDate(),
    title,
    source: `eventType-${eventTypeId}-booking-${id}`,
    userId,
  }));

  const limitManager = new LimitManager();

  await getBusyTimesFromBookingLimits({
    bookings: busyTimes,
    bookingLimits,
    dateFrom,
    dateTo,
    limitManager,
    rescheduleUid,
    teamId,
    user,
    includeManagedEvents,
    timeZone,
  });

  return limitManager.getBusyTimes();
};
