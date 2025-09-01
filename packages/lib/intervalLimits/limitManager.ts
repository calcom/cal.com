import type { Dayjs } from "@calcom/dayjs";
import { weekStartNum } from "@calcom/lib/weekstart";
import type { EventBusyDate } from "@calcom/types/Calendar";

import type { IntervalLimitUnit } from "./intervalLimitSchema";

type BusyMapKey = `${IntervalLimitUnit}-${ReturnType<Dayjs["toISOString"]>}`;

/**
 * Helps create, check, and return busy times from limits (with parallel support)
 */
export default class LimitManager {
  private busyMap: Map<BusyMapKey, EventBusyDate> = new Map();
  private weekStart: string;

  constructor(weekStart?: string) {
    this.weekStart = weekStart || "Monday";
  }

  /**
   * Creates a busy map key
   */
  private createKey(start: Dayjs, unit: IntervalLimitUnit, timeZone?: string): BusyMapKey {
    const tzStart = timeZone ? start.tz(timeZone) : start;

    if (unit === "week") {
      const weekStartIndex = weekStartNum(this.weekStart);
      const currentDayIndex = tzStart.day();
      const daysToSubtract = (currentDayIndex - weekStartIndex + 7) % 7;
      const alignedStart = tzStart.subtract(daysToSubtract, "days").startOf("day");
      return `${unit}-${alignedStart.toISOString()}`;
    } else {
      return `${unit}-${tzStart.startOf(unit).toISOString()}`;
    }
  }

  /**
   * Gets the proper end date for a period based on user's week start preference
   */
  private getPeriodEnd(start: Dayjs, unit: IntervalLimitUnit, timeZone?: string): Dayjs {
    const tzStart = timeZone ? start.tz(timeZone) : start;

    if (unit === "week") {
      return tzStart.add(6, "days").endOf("day");
    } else {
      return tzStart.endOf(unit);
    }
  }

  /**
   * Adjusts the start date for weekly periods based on user's week start preference
   */
  private adjustWeekStart(start: Dayjs, timeZone?: string): Dayjs {
    const tzStart = timeZone ? start.tz(timeZone) : start;
    const weekStartIndex = weekStartNum(this.weekStart);
    const currentDayIndex = tzStart.day();

    const daysToSubtract = (currentDayIndex - weekStartIndex + 7) % 7;
    return tzStart.subtract(daysToSubtract, "days").startOf("day");
  }

  /**
   * Checks if already marked busy by ancestors or siblings
   */
  isAlreadyBusy(start: Dayjs, unit: IntervalLimitUnit, timeZone?: string) {
    if (this.busyMap.has(this.createKey(start, "year", timeZone))) return true;

    if (unit === "month" && this.busyMap.has(this.createKey(start, "month", timeZone))) {
      return true;
    } else if (
      unit === "week" &&
      // weeks can be part of two months
      ((this.busyMap.has(this.createKey(start, "month", timeZone)) &&
        this.busyMap.has(this.createKey(start.endOf("week"), "month", timeZone))) ||
        this.busyMap.has(this.createKey(start, "week", timeZone)))
    ) {
      return true;
    } else if (
      unit === "day" &&
      (this.busyMap.has(this.createKey(start, "month", timeZone)) ||
        this.busyMap.has(this.createKey(start, "week", timeZone)) ||
        this.busyMap.has(this.createKey(start, "day", timeZone)))
    ) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Adds a new busy time
   */
  addBusyTime(start: Dayjs, unit: IntervalLimitUnit, timeZone?: string) {
    let adjustedStart = start;

    // For weekly periods, adjust the start to the user's preferred week start day
    if (unit === "week") {
      adjustedStart = this.adjustWeekStart(start, timeZone);
    } else {
      adjustedStart = timeZone ? start.tz(timeZone) : start;
      adjustedStart = adjustedStart.startOf(unit);
    }

    const periodEnd = this.getPeriodEnd(adjustedStart, unit, timeZone);

    const key = this.createKey(adjustedStart, unit, timeZone);
    this.busyMap.set(key, {
      start: adjustedStart.toISOString(),
      end: periodEnd.toISOString(),
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
