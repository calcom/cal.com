import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import type { EventBusyDetails } from "@calcom/types/Calendar";

import type { IntervalLimitUnit } from "./intervalLimitSchema";

/**
 * Extracts date parameters from a booking and period
 * @param booking The booking to extract date parameters from
 * @param periodStart The start of the period
 * @param periodEnd The end of the period
 * @param timeZone The timezone to use
 * @returns Object containing extracted date parameters
 */
export function extractDateParameters(
  booking: EventBusyDetails,
  periodStart: Dayjs,
  periodEnd: Dayjs,
  timeZone: string
) {
  const bookingStart = dayjs(booking.start).tz(timeZone);
  const bookingDay = bookingStart.format("YYYY-MM-DD");
  const periodStartDay = periodStart.format("YYYY-MM-DD");
  const periodEndDay = periodEnd.format("YYYY-MM-DD");

  return {
    bookingStart,
    bookingDay,
    periodStartDay,
    periodEndDay,
  };
}

/**
 * Checks if a booking overlaps a given period using interval overlap logic.
 * A booking overlaps the period when booking.start < period.end AND booking.end > period.start.
 * This correctly handles bookings that cross period boundaries (e.g., midnight).
 * @param booking The booking to check
 * @param periodStart The start of the period
 * @param periodEnd The end of the period
 * @param timeZone The timezone to use
 * @returns Boolean indicating if the booking overlaps the period
 */
export function isBookingWithinPeriod(
  booking: EventBusyDetails,
  periodStart: Dayjs,
  periodEnd: Dayjs,
  timeZone: string
) {
  const bookingStart = dayjs(booking.start).tz(timeZone);
  const bookingEnd = dayjs(booking.end).tz(timeZone);

  // Standard interval overlap: not (bookingEnd <= periodStart || bookingStart >= periodEnd)
  return !(bookingEnd.isSameOrBefore(periodStart) || bookingStart.isSameOrAfter(periodEnd));
}

/**
 * Gets unit from a busy time's start and end dates
 * @param start The start date
 * @param end The end date
 * @returns The appropriate interval limit unit
 */
export function getUnitFromBusyTime(start: Dayjs, end: Dayjs): IntervalLimitUnit {
  if (end.diff(start, "year") >= 1) {
    return "year";
  } else if (end.diff(start, "month") >= 1) {
    return "month";
  } else if (end.diff(start, "week") >= 1) {
    return "week";
  } else {
    return "day";
  }
}
