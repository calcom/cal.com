import type { IntervalLimit } from "./intervalLimitSchema";
import { intervalLimitsType } from "./intervalLimitSchema";

export function isDurationLimit(obj: unknown): obj is IntervalLimit {
  return intervalLimitsType.safeParse(obj).success;
}

export function parseDurationLimit(obj: unknown): IntervalLimit | null {
  let durationLimit: IntervalLimit | null = null;
  if (isDurationLimit(obj)) durationLimit = obj;
  return durationLimit;
}
