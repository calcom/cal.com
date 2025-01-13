import type { Dayjs } from "@calcom/dayjs";
import type { EventBusyDate, IntervalLimitUnit } from "@calcom/types/Calendar";

type BusyMapKey = `${IntervalLimitUnit}-${ReturnType<Dayjs["toISOString"]>}`;

/**
 * Helps create, check, and return busy times from limits (with parallel support)
 */
export default class LimitManager {
  private busyMap: Map<BusyMapKey, EventBusyDate> = new Map();

  /**
   * Creates a busy map key
   */
  private static createKey(start: Dayjs, unit: IntervalLimitUnit): BusyMapKey {
    return `${unit}-${start.startOf(unit).toISOString()}`;
  }

  /**
   * Checks if already marked busy by ancestors or siblings
   */
  isAlreadyBusy(start: Dayjs, unit: IntervalLimitUnit) {
    if (this.busyMap.has(LimitManager.createKey(start, "year"))) return true;

    if (unit === "month" && this.busyMap.has(LimitManager.createKey(start, "month"))) {
      return true;
    } else if (
      unit === "week" &&
      // weeks can be part of two months
      ((this.busyMap.has(LimitManager.createKey(start, "month")) &&
        this.busyMap.has(LimitManager.createKey(start.endOf("week"), "month"))) ||
        this.busyMap.has(LimitManager.createKey(start, "week")))
    ) {
      return true;
    } else if (
      unit === "day" &&
      (this.busyMap.has(LimitManager.createKey(start, "month")) ||
        this.busyMap.has(LimitManager.createKey(start, "week")) ||
        this.busyMap.has(LimitManager.createKey(start, "day")))
    ) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Adds a new busy time
   */
  addBusyTime(start: Dayjs, unit: IntervalLimitUnit) {
    this.busyMap.set(`${unit}-${start.toISOString()}`, {
      start: start.toISOString(),
      end: start.endOf(unit).toISOString(),
    });
  }

  /**
   * Returns all busy times
   */
  getBusyTimes() {
    return Array.from(this.busyMap.values());
  }
}
