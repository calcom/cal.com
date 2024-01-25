import { MINUTES_IN_HOUR, MINUTES_IN_DAY } from "../lib/limitsUtils";
import type { DurationType } from "../types";

export default function findDurationType(value: number): DurationType {
  if (value % MINUTES_IN_DAY === 0) return "days";
  if (value % MINUTES_IN_HOUR === 0) return "hours";
  return "minutes";
}
