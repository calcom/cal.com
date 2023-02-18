import type { IntervalLimit } from "@calcom/types/Calendar";

export const intervalOrderKeys = ["PER_DAY", "PER_WEEK", "PER_MONTH", "PER_YEAR"];
export type IntervalLimitsKey = keyof IntervalLimit;

export const INTERVAL_LIMIT_OPTIONS: {
  value: keyof IntervalLimit;
  label: string;
}[] = intervalOrderKeys.map((key) => ({
  value: key as keyof IntervalLimit,
  label: `Per ${key.split("_")[1].toLocaleLowerCase()}`,
}));
