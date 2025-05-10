import { intervalLimitsType } from "./intervalLimitSchema";
import type { IntervalLimit } from "./intervalLimitSchema";

export function isBookingLimit(obj: unknown): obj is IntervalLimit {
  return intervalLimitsType.safeParse(obj).success;
}

const bookingLimitCache = new Map<string, IntervalLimit | null>();

export function parseBookingLimit(obj: unknown): IntervalLimit | null {
  const cacheKey = JSON.stringify(obj);
  if (bookingLimitCache.has(cacheKey)) {
    return bookingLimitCache.get(cacheKey) || null;
  }

  let bookingLimit: IntervalLimit | null = null;
  if (isBookingLimit(obj)) bookingLimit = obj;

  bookingLimitCache.set(cacheKey, bookingLimit);
  return bookingLimit;
}
