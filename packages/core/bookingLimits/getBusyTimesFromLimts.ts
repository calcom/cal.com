import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { descendingLimitKeys, intervalLimitKeyToUnit } from "@calcom/lib/intervalLimit";
import { checkBookingLimit } from "@calcom/lib/server";
import { performance } from "@calcom/lib/server/perfObserver";
import { getTotalBookingDuration } from "@calcom/lib/server/queries";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { EventBusyDetails, IntervalLimit } from "@calcom/types/Calendar";

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
  bookings: EventBusyDetails[]
) => {
  performance.mark("limitsStart");

  // shared amongst limiters to prevent processing known busy periods
  const limitManager = new LimitManager();

  // run this first, as counting bookings should always run faster..
  if (bookingLimits) {
    performance.mark("bookingLimitsStart");
    await getBusyTimesFromBookingLimits(
      bookings,
      bookingLimits,
      dateFrom,
      dateTo,
      eventType.id,
      limitManager
    );
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
      limitManager
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

const _getBusyTimesFromBookingLimits = async (
  bookings: EventBusyDetails[],
  bookingLimits: IntervalLimit,
  dateFrom: Dayjs,
  dateTo: Dayjs,
  eventTypeId: number,
  limitManager: LimitManager
) => {
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
  limitManager: LimitManager
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
  rescheduleUid?: string
) => {
  performance.mark("teamLimitsStart");

  const startDate = dayjs(dateFrom).startOf("week").toDate();
  const endDate = dayjs(dateTo).endOf("week").toDate();
  // maybe I already have them and can filter ?

  const teamBookings = await BookingRepository.getAllAcceptedTeamBookingsOfUser({
    user,
    teamId,
    startDate,
    endDate,
  });

  const limitManager = new LimitManager();

  for (const key of descendingLimitKeys) {
    const limit = bookingLimits?.[key];
    if (!limit) continue;

    const unit = intervalLimitKeyToUnit(key);
    const periodStartDates = getPeriodStartDatesBetween(dateFrom, dateTo, unit);

    for (const periodStart of periodStartDates) {
      if (limitManager.isAlreadyBusy(periodStart, unit)) continue;
      // check if an entry already exists with th
      const periodEnd = periodStart.endOf(unit);

      if (unit === "year") {
        const bookingsInPeriod = await prisma.booking.count({
          where: {
            userId: user.id,
            status: BookingStatus.ACCEPTED,
            eventType: {
              OR: [
                { teamId },
                {
                  parent: {
                    teamId,
                  },
                },
              ],
            },
            startTime: {
              gte: periodStart.toDate(),
            },
            endTime: {
              lte: periodEnd.toDate(),
            },
            uid: {
              not: rescheduleUid,
            },
          },
        });
        if (bookingsInPeriod >= limit) {
          limitManager.addBusyTime(periodStart, unit);
        }
      } else {
        let totalBookings = 0;
        for (const booking of teamBookings) {
          // consider booking part of period independent of end date
          if (!dayjs(booking.startTime).isBetween(periodStart, periodEnd)) {
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
  }

  performance.mark("teamLimitsEnd");
  performance.measure(`checking all team limits took $1'`, "teamLimitsStart", "teamLimitsEnd");
  return limitManager.getBusyTimes();
};
