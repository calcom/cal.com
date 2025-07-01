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
 * Checks if a booking is within a given period
 * @param booking The booking to check
 * @param periodStart The start of the period
 * @param periodEnd The end of the period
 * @param timeZone The timezone to use
 * @returns Boolean indicating if the booking is within the period
 */
export function isBookingWithinPeriod(
  booking: EventBusyDetails,
  periodStart: Dayjs,
  periodEnd: Dayjs,
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

/**
 * Sorts bookings by start time for efficient range queries
 * @param bookings Array of bookings to sort
 * @param timeZone Timezone for date comparison
 * @returns Sorted array of bookings
 */
export function sortBookingsByStartTime(bookings: EventBusyDetails[], timeZone: string): EventBusyDetails[] {
  return [...bookings].sort((a, b) => {
    const aStart = dayjs(a.start).tz(timeZone);
    const bStart = dayjs(b.start).tz(timeZone);
    return aStart.valueOf() - bStart.valueOf();
  });
}

/**
 * Finds bookings that overlap with a given period using optimized iteration
 * @param sortedBookings Pre-sorted array of bookings by start time
 * @param periodStart Start of the period
 * @param periodEnd End of the period
 * @param timeZone Timezone for date comparison
 * @returns Array of bookings within the period
 */
export function findBookingsInPeriod(
  sortedBookings: EventBusyDetails[],
  periodStart: Dayjs,
  periodEnd: Dayjs,
  timeZone: string
): EventBusyDetails[] {
  const result: EventBusyDetails[] = [];

  for (const booking of sortedBookings) {
    if (isBookingWithinPeriod(booking, periodStart, periodEnd, timeZone)) {
      result.push(booking);
    }
    const bookingStart = dayjs(booking.start).tz(timeZone);
    const periodEndDay = periodEnd.format("YYYY-MM-DD");
    const bookingDay = bookingStart.format("YYYY-MM-DD");
    if (bookingDay > periodEndDay) {
      break;
    }
  }

  return result;
}
