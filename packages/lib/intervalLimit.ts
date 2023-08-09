import type { IntervalLimit, IntervalLimitUnit } from "@calcom/types/Calendar";

export const ascendingLimitKeys: (keyof IntervalLimit)[] = ["PER_DAY", "PER_WEEK", "PER_MONTH", "PER_YEAR"];

export const descendingLimitKeys = [...ascendingLimitKeys].reverse();

/**
 * Turns `PER_DAY` into `day`, `PER_WEEK` into `week` etc.
 */
export function intervalLimitKeyToUnit(key: keyof IntervalLimit) {
  return key.split("_")[1].toLowerCase() as IntervalLimitUnit;
}
