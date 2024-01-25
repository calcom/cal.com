import { MINUTES_IN_DAY, MINUTES_IN_HOUR, HOURS_IN_DAY } from "../lib/limitsUtils";
import type { DurationType } from "../types";

export default function convertToNewDurationType(
  prevType: DurationType,
  newType: DurationType,
  prevValue: number
) {
  /** Convert `prevValue` from `prevType` to `newType` */
  const newDurationTypeMap = {
    minutes_minutes: () => prevValue,
    minutes_hours: () => prevValue / MINUTES_IN_HOUR,
    minutes_days: () => prevValue / MINUTES_IN_DAY,
    hours_minutes: () => prevValue * MINUTES_IN_HOUR,
    hours_hours: () => prevValue,
    hours_days: () => prevValue * HOURS_IN_DAY,
    days_minutes: () => prevValue * MINUTES_IN_DAY,
    days_hours: () => prevValue * HOURS_IN_DAY,
    days_days: () => prevValue,
  };
  const getNewValue = newDurationTypeMap[`${prevType}_${newType}`];
  const newValue = getNewValue();
  return Math.ceil(newValue);
}
