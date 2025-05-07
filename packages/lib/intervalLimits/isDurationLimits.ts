import type { IntervalLimit } from "./intervalLimitSchema";
import { intervalLimitsType } from "./intervalLimitSchema";

export function isDurationLimit(obj: unknown): obj is IntervalLimit {
  return intervalLimitsType.safeParse(obj).success;
}

const durationLimitCache = new Map<string, IntervalLimit | null>();

export function parseDurationLimit(obj: unknown): IntervalLimit | null {
  const cacheKey = JSON.stringify(obj);
  if (durationLimitCache.has(cacheKey)) {
    return durationLimitCache.get(cacheKey) || null;
  }

  let durationLimit: IntervalLimit | null = null;
  if (isDurationLimit(obj)) durationLimit = obj;

  durationLimitCache.set(cacheKey, durationLimit);
  return durationLimit;
}
