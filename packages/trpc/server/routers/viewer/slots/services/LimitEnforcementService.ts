import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import type { UserAvailabilityService } from "@calcom/features/availability/lib/getUserAvailability";
import type { CheckBookingLimitsService } from "@calcom/features/bookings/lib/checkBookingLimits";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { BusyTimesService } from "@calcom/features/busyTimes/services/getBusyTimes";
import { descendingLimitKeys, intervalLimitKeyToUnit } from "@calcom/lib/intervalLimits/intervalLimit";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import LimitManager from "@calcom/lib/intervalLimits/limitManager";
import { isBookingWithinPeriod } from "@calcom/lib/intervalLimits/utils";
import { withReporting } from "@calcom/lib/sentryWrapper";
import type { EventBusyDetails } from "@calcom/types/Calendar";

type EventType = {
  id: number;
  length: number;
};

interface LimitEnforcementDependencies {
  busyTimesService: BusyTimesService;
  userAvailabilityService: UserAvailabilityService;
  checkBookingLimitsService: CheckBookingLimitsService;
  bookingRepo: BookingRepository;
}

/**
 * Service responsible for enforcing booking and duration limits.
 * Handles individual user limits and team-level limits.
 */
export class LimitEnforcementService {
  constructor(private readonly dependencies: LimitEnforcementDependencies) {}

  private async _getBusyTimesFromLimitsForUsers(
    users: { id: number; email: string }[],
    bookingLimits: IntervalLimit | null,
    durationLimits: IntervalLimit | null,
    dateFrom: Dayjs,
    dateTo: Dayjs,
    duration: number | undefined,
    eventType: EventType,
    timeZone: string,
    rescheduleUid?: string
  ) {
    const userBusyTimesMap = new Map<number, EventBusyDetails[]>();

    if (!bookingLimits && !durationLimits) {
      return userBusyTimesMap;
    }

    const { limitDateFrom, limitDateTo } = this.dependencies.busyTimesService.getStartEndDateforLimitCheck(
      dateFrom.toISOString(),
      dateTo.toISOString(),
      bookingLimits || durationLimits
    );

    const busyTimesFromLimitsBookings = await this.dependencies.busyTimesService.getBusyTimesForLimitChecks({
      userIds: users.map((user) => user.id),
      eventTypeId: eventType.id,
      startDate: limitDateFrom.format(),
      endDate: limitDateTo.format(),
      rescheduleUid,
      bookingLimits,
      durationLimits,
    });

    const globalLimitManager = new LimitManager();

    if (bookingLimits) {
      for (const key of descendingLimitKeys) {
        const limit = bookingLimits?.[key];
        if (!limit) continue;

        const unit = intervalLimitKeyToUnit(key);
        const periodStartDates = this.dependencies.userAvailabilityService.getPeriodStartDatesBetween(
          dateFrom,
          dateTo,
          unit,
          timeZone
        );

        for (const periodStart of periodStartDates) {
          if (globalLimitManager.isAlreadyBusy(periodStart, unit, timeZone)) continue;

          const periodEnd = periodStart.endOf(unit);
          let totalBookings = 0;

          for (const booking of busyTimesFromLimitsBookings) {
            if (!isBookingWithinPeriod(booking, periodStart, periodEnd, timeZone)) {
              continue;
            }

            totalBookings++;
            if (totalBookings >= limit) {
              globalLimitManager.addBusyTime(periodStart, unit, timeZone);
              break;
            }
          }
        }
      }
    }

    for (const user of users) {
      const userBookings = busyTimesFromLimitsBookings.filter((booking) => booking.userId === user.id);
      const limitManager = new LimitManager();

      limitManager.mergeBusyTimes(globalLimitManager);

      if (bookingLimits) {
        for (const key of descendingLimitKeys) {
          const limit = bookingLimits?.[key];
          if (!limit) continue;

          const unit = intervalLimitKeyToUnit(key);
          const periodStartDates = this.dependencies.userAvailabilityService.getPeriodStartDatesBetween(
            dateFrom,
            dateTo,
            unit,
            timeZone
          );

          for (const periodStart of periodStartDates) {
            if (limitManager.isAlreadyBusy(periodStart, unit, timeZone)) continue;

            if (unit === "year") {
              try {
                await this.dependencies.checkBookingLimitsService.checkBookingLimit({
                  eventStartDate: periodStart.toDate(),
                  limitingNumber: limit,
                  eventId: eventType.id,
                  key,
                  user,
                  rescheduleUid,
                  timeZone,
                });
              } catch {
                limitManager.addBusyTime(periodStart, unit, timeZone);
                if (
                  periodStartDates.every((start: Dayjs) => limitManager.isAlreadyBusy(start, unit, timeZone))
                ) {
                  break;
                }
              }
              continue;
            }

            const periodEnd = periodStart.endOf(unit);
            let totalBookings = 0;

            for (const booking of userBookings) {
              if (!isBookingWithinPeriod(booking, periodStart, periodEnd, timeZone)) {
                continue;
              }

              totalBookings++;
              if (totalBookings >= limit) {
                limitManager.addBusyTime(periodStart, unit, timeZone);
                break;
              }
            }
          }
        }
      }

      if (durationLimits) {
        for (const key of descendingLimitKeys) {
          const limit = durationLimits?.[key];
          if (!limit) continue;

          const unit = intervalLimitKeyToUnit(key);
          const periodStartDates = this.dependencies.userAvailabilityService.getPeriodStartDatesBetween(
            dateFrom,
            dateTo,
            unit,
            timeZone
          );

          for (const periodStart of periodStartDates) {
            if (limitManager.isAlreadyBusy(periodStart, unit, timeZone)) continue;

            const selectedDuration = (duration || eventType.length) ?? 0;

            if (selectedDuration > limit) {
              limitManager.addBusyTime(periodStart, unit, timeZone);
              continue;
            }

            if (unit === "year") {
              const totalYearlyDuration = await this.dependencies.bookingRepo.getTotalBookingDuration({
                eventId: eventType.id,
                startDate: periodStart.toDate(),
                endDate: periodStart.endOf(unit).toDate(),
                rescheduleUid,
              });
              if (totalYearlyDuration + selectedDuration > limit) {
                limitManager.addBusyTime(periodStart, unit, timeZone);
                if (
                  periodStartDates.every((start: Dayjs) => limitManager.isAlreadyBusy(start, unit, timeZone))
                ) {
                  break;
                }
              }
              continue;
            }

            const periodEnd = periodStart.endOf(unit);
            let totalDuration = selectedDuration;

            for (const booking of userBookings) {
              if (!isBookingWithinPeriod(booking, periodStart, periodEnd, timeZone)) {
                continue;
              }
              totalDuration += dayjs(booking.end).diff(dayjs(booking.start), "minute");
              if (totalDuration > limit) {
                limitManager.addBusyTime(periodStart, unit, timeZone);
                break;
              }
            }
          }
        }
      }

      userBusyTimesMap.set(user.id, limitManager.getBusyTimes());
    }

    return userBusyTimesMap;
  }

  getBusyTimesFromLimitsForUsers = withReporting(
    this._getBusyTimesFromLimitsForUsers.bind(this),
    "getBusyTimesFromLimitsForUsers"
  );

  private async _getBusyTimesFromTeamLimitsForUsers(
    users: { id: number; email: string }[],
    bookingLimits: IntervalLimit,
    dateFrom: Dayjs,
    dateTo: Dayjs,
    teamId: number,
    includeManagedEvents: boolean,
    timeZone: string,
    rescheduleUid?: string
  ) {
    const { limitDateFrom, limitDateTo } = this.dependencies.busyTimesService.getStartEndDateforLimitCheck(
      dateFrom.toISOString(),
      dateTo.toISOString(),
      bookingLimits
    );

    const bookingRepo = this.dependencies.bookingRepo;
    const bookings = await bookingRepo.getAllAcceptedTeamBookingsOfUsers({
      users,
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

    const globalLimitManager = new LimitManager();

    for (const key of descendingLimitKeys) {
      const limit = bookingLimits?.[key];
      if (!limit) continue;

      const unit = intervalLimitKeyToUnit(key);
      const periodStartDates = this.dependencies.userAvailabilityService.getPeriodStartDatesBetween(
        dateFrom,
        dateTo,
        unit,
        timeZone
      );

      for (const periodStart of periodStartDates) {
        if (globalLimitManager.isAlreadyBusy(periodStart, unit, timeZone)) continue;

        const periodEnd = periodStart.endOf(unit);
        let totalBookings = 0;

        for (const booking of busyTimes) {
          if (!isBookingWithinPeriod(booking, periodStart, periodEnd, timeZone)) {
            continue;
          }

          totalBookings++;
          if (totalBookings >= limit) {
            globalLimitManager.addBusyTime(periodStart, unit, timeZone);
            break;
          }
        }
      }
    }

    const userBusyTimesMap = new Map();

    for (const user of users) {
      const userBusyTimes = busyTimes.filter((busyTime) => busyTime.userId === user.id);
      const limitManager = new LimitManager();

      limitManager.mergeBusyTimes(globalLimitManager);

      for (const key of descendingLimitKeys) {
        const limit = bookingLimits?.[key];
        if (!limit) continue;

        const unit = intervalLimitKeyToUnit(key);
        const periodStartDates = this.dependencies.userAvailabilityService.getPeriodStartDatesBetween(
          dateFrom,
          dateTo,
          unit,
          timeZone
        );

        for (const periodStart of periodStartDates) {
          if (limitManager.isAlreadyBusy(periodStart, unit, timeZone)) continue;

          if (unit === "year") {
            try {
              await this.dependencies.checkBookingLimitsService.checkBookingLimit({
                eventStartDate: periodStart.toDate(),
                limitingNumber: limit,
                key,
                teamId,
                user,
                rescheduleUid,
                includeManagedEvents,
                timeZone,
              });
            } catch {
              limitManager.addBusyTime(periodStart, unit, timeZone);
              if (
                periodStartDates.every((start: Dayjs) => limitManager.isAlreadyBusy(start, unit, timeZone))
              ) {
                return;
              }
            }
            continue;
          }

          const periodEnd = periodStart.endOf(unit);
          let totalBookings = 0;

          for (const booking of userBusyTimes) {
            if (!isBookingWithinPeriod(booking, periodStart, periodEnd, timeZone)) {
              continue;
            }

            totalBookings++;
            if (totalBookings >= limit) {
              limitManager.addBusyTime(periodStart, unit, timeZone);
              break;
            }
          }
        }
      }

      userBusyTimesMap.set(user.id, limitManager.getBusyTimes());
    }

    return userBusyTimesMap;
  }

  getBusyTimesFromTeamLimitsForUsers = withReporting(
    this._getBusyTimesFromTeamLimitsForUsers.bind(this),
    "getBusyTimesFromTeamLimitsForUsers"
  );
}
