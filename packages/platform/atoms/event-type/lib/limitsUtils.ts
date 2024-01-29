import type { DurationType, IntervalLimit, IntervalLimitUnit } from "../types";

const bufferIntervals = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const slotIntervals = [5, 10, 15, 20, 30, 45, 60, 75, 90, 105, 120];

export const MINUTES_IN_HOUR = 60;
export const MINUTES_IN_DAY = 1440;
export const HOURS_IN_DAY = 24;

export const beforeAndAfterBufferOptions = [
  {
    label: "No buffer time",
    value: 0,
  },
  ...bufferIntervals.map((minutes) => ({
    label: `${minutes} Minutes`,
    value: minutes,
  })),
];

export const slotIntervalOptions = [
  {
    label: "Use event length (default)",
    value: -1,
  },
  ...slotIntervals.map((minutes) => ({
    label: `${minutes} Minutes`,
    value: minutes,
  })),
];

export const PERIOD_TYPES = [
  {
    type: "ROLLING" as const,
    suffix: "into the future",
  },
  {
    type: "RANGE" as const,
    prefix: "Within a date range",
  },
  {
    type: "UNLIMITED" as const,
    prefix: "Indefinitely into the future",
  },
];

export const optionsPeriod = [
  { value: 1, label: "calendar days" },
  { value: 0, label: "business days" },
];

export const durationTypeOptions: {
  value: DurationType;
  label: string;
}[] = [
  {
    label: "Minutes",
    value: "minutes",
  },
  {
    label: "Hours",
    value: "hours",
  },
  {
    label: "days",
    value: "days",
  },
];

export const ascendingLimitKeys: (keyof IntervalLimit)[] = ["PER_DAY", "PER_WEEK", "PER_MONTH", "PER_YEAR"];
export function intervalLimitKeyToUnit(key: keyof IntervalLimit) {
  return key.split("_")[1].toLowerCase() as IntervalLimitUnit;
}

export const INTERVAL_LIMIT_OPTIONS = ascendingLimitKeys.map((key) => ({
  value: key as keyof IntervalLimit,
  label: `Per ${intervalLimitKeyToUnit(key)}`,
}));

export const PeriodType = {
  UNLIMITED: "UNLIMITED",
  ROLLING: "ROLLING",
  RANGE: "RANGE",
} as const;
