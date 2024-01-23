import type { DurationType } from "../types";

const bufferIntervals = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const slotIntervals = [5, 10, 15, 20, 30, 45, 60, 75, 90, 105, 120];

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
