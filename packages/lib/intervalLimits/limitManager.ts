import type { Dayjs } from "@calcom/dayjs";
import type { EventBusyDate } from "@calcom/types/Calendar";

import type { IntervalLimitUnit } from "./intervalLimitSchema";

type BusyMapKey = `${IntervalLimitUnit}-${ReturnType<Dayjs["toISOString"]>}`;

/**
 * Helps create, check, and return busy times from limits (with parallel support)
 */
export default class LimitManager {
  private busyMap: Map<BusyMapKey, EventBusyDate> = new Map();

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
   * Adds a new busy time
   */
  addBusyTime(start: Dayjs, unit: IntervalLimitUnit, timeZone?: string) {
    const tzStart = timeZone ? start.tz(timeZone) : start;
    this.busyMap.set(`${unit}-${tzStart.toISOString()}`, {
      start: tzStart.toISOString(),
      end: tzStart.endOf(unit).toISOString(),
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
