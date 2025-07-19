import type { DateFnsDate } from "@calcom/lib/dateFns";
import { tz, format, diff } from "@calcom/lib/dateFns";
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
  periodStart: DateFnsDate,
  periodEnd: DateFnsDate,
  timeZone: string
) {
  const bookingStart = tz(new Date(booking.start), timeZone);
  const bookingDay = format(bookingStart, "yyyy-MM-dd");
  const periodStartDay = format(periodStart, "yyyy-MM-dd");
  const periodEndDay = format(periodEnd, "yyyy-MM-dd");

  return {
    bookingStart,
    bookingDay,
    periodStartDay,
    periodEndDay,
  };
}

/**
 * Checks if a booking is within a given period
 * @param booking The booking to check
 * @param periodStart The start of the period
 * @param periodEnd The end of the period
 * @param timeZone The timezone to use
 * @returns Boolean indicating if the booking is within the period
 */
export function isBookingWithinPeriod(
  booking: EventBusyDetails,
  periodStart: DateFnsDate,
  periodEnd: DateFnsDate,
  timeZone: string
) {
  const { bookingDay, periodStartDay, periodEndDay } = extractDateParameters(
    booking,
    periodStart,
    periodEnd,
    timeZone
  );

  return !(bookingDay < periodStartDay || bookingDay > periodEndDay);
}

/**
 * Gets unit from a busy time's start and end dates
 * @param start The start date
 * @param end The end date
 * @returns The appropriate interval limit unit
 */
export function getUnitFromBusyTime(start: DateFnsDate, end: DateFnsDate): IntervalLimitUnit {
  if (diff(end, start, "year") >= 1) {
    return "year";
  } else if (diff(end, start, "month") >= 1) {
    return "month";
  } else if (diff(end, start, "week") >= 1) {
    return "week";
  } else {
    return "day";
  }
}
