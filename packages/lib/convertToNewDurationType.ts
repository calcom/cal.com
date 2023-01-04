export const MINUTES_IN_HOUR = 60;
export const MINUTES_IN_DAY = 1440;
export const HOURS_IN_DAY = 24;

export type DurationType = "minutes" | "hours" | "days";

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
