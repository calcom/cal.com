import type { Dayjs } from "@calcom/dayjs";
import type { EventBusyDetails } from "@calcom/types/Calendar";
import type { IntervalLimitUnit } from "./intervalLimitSchema";

type BusyMapKey = `${IntervalLimitUnit}-${ReturnType<Dayjs["toISOString"]>}`;

/**
 * Limit sources with both title and source information
 * Returns user-facing title (translation key) and internal debug string
 */
export const LimitSources = {
  eventBookingLimit: (params: { limit: number; unit: IntervalLimitUnit }) => ({
    title: "busy_time.event_booking_limit",
    source: `Event Booking Limit for User: ${params.limit} per ${params.unit}`,
  }),

  eventDurationLimit: (params: { limit: number; unit: IntervalLimitUnit }) => ({
    title: "busy_time.event_duration_limit",
    source: `Event Duration Limit for User: ${params.limit} minutes per ${params.unit}`,
  }),

  teamBookingLimit: (params: { limit: number; unit: IntervalLimitUnit }) => ({
    title: "busy_time.team_booking_limit",
    source: `Team Booking Limit: ${params.limit} per ${params.unit}`,
  }),
} as const;

/**
 * Helps create, check, and return busy times from limits (with parallel support)
 */
export default class LimitManager {
  private busyMap: Map<BusyMapKey, EventBusyDetails> = new Map();

  /**
   * Creates a busy map key
   */
  private static createKey(start: Dayjs, unit: IntervalLimitUnit, timeZone?: string): BusyMapKey {
    const tzStart = timeZone ? start.tz(timeZone) : start;
    return `${unit}-${tzStart.startOf(unit).toISOString()}`;
  }

  /**
   * Checks if already marked busy by ancestors or siblings
   */
  isAlreadyBusy(start: Dayjs, unit: IntervalLimitUnit, timeZone?: string) {
    if (this.busyMap.has(LimitManager.createKey(start, "year", timeZone))) return true;

    if (unit === "month" && this.busyMap.has(LimitManager.createKey(start, "month", timeZone))) {
      return true;
    } else if (
      unit === "week" &&
      // weeks can be part of two months
      ((this.busyMap.has(LimitManager.createKey(start, "month", timeZone)) &&
        this.busyMap.has(LimitManager.createKey(start.endOf("week"), "month", timeZone))) ||
        this.busyMap.has(LimitManager.createKey(start, "week", timeZone)))
    ) {
      return true;
    } else if (
      unit === "day" &&
      (this.busyMap.has(LimitManager.createKey(start, "month", timeZone)) ||
        this.busyMap.has(LimitManager.createKey(start, "week", timeZone)) ||
        this.busyMap.has(LimitManager.createKey(start, "day", timeZone)))
    ) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Adds a new busy time with title and source
   * @param params.start - Start time of the busy period
   * @param params.unit - Interval unit (day, week, month, year)
   * @param params.timeZone - Optional timezone
   * @param params.title - User-facing translation key (displayed in calendars)
   * @param params.source - Internal debug string (for logging/troubleshooting)
   */
  addBusyTime(params: {
    start: Dayjs;
    unit: IntervalLimitUnit;
    timeZone?: string;
    title: string;
    source: string;
  }) {
    const tzStart = params.timeZone ? params.start.tz(params.timeZone) : params.start;
    this.busyMap.set(`${params.unit}-${tzStart.toISOString()}`, {
      start: tzStart.toISOString(),
      end: tzStart.endOf(params.unit).toISOString(),
      title: params.title,
      source: params.source,
    });
  }

  /**
   * Merges busy times from another LimitManager
   */
  mergeBusyTimes(otherManager: LimitManager) {
    otherManager.busyMap.forEach((busyTime, key) => {
      if (!this.busyMap.has(key)) {
        this.busyMap.set(key, busyTime);
      }
    });
  }

  /**
   * Returns all busy times
   */
  getBusyTimes() {
    return Array.from(this.busyMap.values());
  }
}
