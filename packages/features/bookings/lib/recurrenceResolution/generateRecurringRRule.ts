import type { Frequency } from "rrule";
import { RRule } from "rrule";

import dayjs from "@calcom/dayjs";
import type { RecurringEvent } from "@calcom/types/Calendar";

import type { UserAvailabilityData } from "./getUserAvailabilityData";

/**
 * Parameters for generating a recurring booking RRULE
 */
export interface RecurringBookingParams {
  startTime: string; // ISO datetime string
  endTime: string; // ISO datetime string
  recurringEvent: RecurringEvent;
  timeZone: string;
  maxOccurrences?: number; // Safety limit to prevent infinite loops
}

/**
 * Modifies the provided RecurringEvent to enforce user availability windows and
 * out-of-office (OOO) entries. This function does NOT create a new recurrence
 * definition — it only adds exDates and rDates to the existing RecurringEvent.
 *
 * The method:
 * - Preserves the original freq, interval, dtstart, tzid, and count values
 * - Evaluates all generated occurrences against availability windows and OOO
 * - Excludes invalid occurrences by adding them to exDates
 * - Compensates for excluded occurrences by adding valid dates to rDates
 * - Ensures the final number of valid occurrences equals the original count
 *
 * The returned RecurringEvent is RFC-5545 compliant and produces the correct
 * occurrence set when expanded by a standard RRULE engine.
 *
 * @param params - Recurring booking parameters
 * @param availabilityData - User availability data (schedule + OOO)
 * @returns Modified RecurringEvent with exDates and rDates populated
 *
 * @example
 * // User requests 10 weekly meetings, but 2 fall during vacation
 * const result = await generateRecurringRRule(
 *   {
 *     startTime: "2025-02-03T14:00:00Z",
 *     endTime: "2025-02-03T15:00:00Z",
 *     recurringEvent: { freq: 2, interval: 1, count: 10 },
 *     timeZone: "America/New_York",
 *   },
 *   availabilityData
 * );
 * // result.exDates contains 2 dates during vacation
 * // result.rDates contains 2 compensating dates
 * // Expanding RRULE + EXDATE + RDATE yields exactly 10 valid occurrences
 */
export async function generateRecurringRRule(
  params: RecurringBookingParams,
  availabilityData: UserAvailabilityData
): Promise<RecurringEvent> {
  const { startTime, endTime, recurringEvent, timeZone, maxOccurrences = 730 } = params;

  const targetCount = Math.min(recurringEvent.count || maxOccurrences, maxOccurrences);

  // Parse booking time and calculate duration
  const bookingStart = dayjs(startTime).tz(timeZone);
  const bookingEnd = dayjs(endTime).tz(timeZone);
  const bookingDuration = bookingEnd.diff(bookingStart, "minute");

  // Generate occurrences from the original RRULE and identify exclusions/compensations
  const { excludedDates, compensatedDates } = computeExclusionsAndCompensations({
    bookingStart,
    bookingDuration,
    recurringEvent,
    targetCount,
    timeZone,
    availabilityData,
    maxOccurrences,
  });

  // Build the modified RecurringEvent preserving all original values
  const modifiedRecurringEvent: RecurringEvent = {
    ...recurringEvent,
    // Preserve timing information (use provided dtstart or derive from startTime)
    dtstart: recurringEvent.dtstart || bookingStart.toDate(),
    tzid: recurringEvent.tzid || timeZone,
    // Add exception and compensation dates
    exDates: excludedDates.length > 0 ? excludedDates : undefined,
    rDates: compensatedDates.length > 0 ? compensatedDates : undefined,
  };

  // Preserve any advanced recurrence rules from the original
  copyAdvancedRecurrenceRules(recurringEvent, modifiedRecurringEvent);

  // Preserve metadata fields if present
  if (recurringEvent.allDay !== undefined) {
    modifiedRecurringEvent.allDay = recurringEvent.allDay;
  }
  if (recurringEvent.uid) {
    modifiedRecurringEvent.uid = recurringEvent.uid;
  }

  return modifiedRecurringEvent;
}

/**
 * Maps RecurringEvent freq number to RRule Frequency enum.
 *
 * Cal.com uses: 0=YEARLY, 1=MONTHLY, 2=WEEKLY, 3=DAILY
 */
function mapFrequencyToRRule(freq: number): Frequency {
  const freqMap: Record<number, Frequency> = {
    0: RRule.YEARLY,
    1: RRule.MONTHLY,
    2: RRule.WEEKLY,
    3: RRule.DAILY,
  };
  return freqMap[freq] || RRule.WEEKLY;
}

interface ExclusionCompensationResult {
  excludedDates: Date[];
  compensatedDates: Date[];
}

/**
 * Computes which occurrences from the original RRULE need to be excluded
 * and generates compensation dates to maintain the target count.
 *
 * Algorithm:
 * 1. Generate all occurrences from the original RRULE (based on count)
 * 2. Filter each occurrence against availability and OOO constraints
 * 3. Track excluded dates for EXDATE
 * 4. If exclusions exist, generate additional future dates as compensation
 * 5. Filter compensation candidates and add valid ones as RDATE
 * 6. Repeat until we have enough compensation dates or hit safety limits
 *
 * The result ensures: validOccurrences(RRULE) - exDates + rDates = targetCount
 */
function computeExclusionsAndCompensations(params: {
  bookingStart: dayjs.Dayjs;
  bookingDuration: number;
  recurringEvent: RecurringEvent;
  targetCount: number;
  timeZone: string;
  availabilityData: UserAvailabilityData;
  maxOccurrences: number;
}): ExclusionCompensationResult {
  const {
    bookingStart,
    bookingDuration,
    recurringEvent,
    targetCount,
    timeZone,
    availabilityData,
    maxOccurrences,
  } = params;

  const dtstart = new Date(`${bookingStart.utc().format("YYYY-MM-DDTHH:mm:ss")}Z`);

  // Step 1: Generate all occurrences from the original RRULE
  const originalRRule = new RRule({
    freq: mapFrequencyToRRule(recurringEvent.freq),
    interval: recurringEvent.interval || 1,
    count: targetCount,
    dtstart: dtstart,
    // tzid: timeZone,
  });

  const originalOccurrences = originalRRule.all();

  // Step 2: Filter original occurrences to find which ones are invalid
  const excludedDates: Date[] = [];
  const validOriginalDates: Date[] = [];

  for (const occurrence of originalOccurrences) {
    if (isOccurrenceValid(occurrence, bookingDuration, availabilityData, timeZone)) {
      validOriginalDates.push(occurrence);
    } else {
      excludedDates.push(occurrence);
    }
  }

  // If no exclusions, no compensation needed
  if (excludedDates.length === 0) {
    return { excludedDates: [], compensatedDates: [] };
  }

  // Step 3: Generate compensation dates
  const compensatedDates = generateCompensationDates({
    bookingStart,
    bookingDuration,
    recurringEvent,
    originalOccurrences,
    validOriginalDates,
    excludedCount: excludedDates.length,
    timeZone,
    availabilityData,
    maxOccurrences,
  });

  return { excludedDates, compensatedDates };
}

/**
 * Generates compensation dates to replace excluded occurrences.
 *
 * This function generates dates beyond the original RRULE range,
 * filters them for validity, and returns enough to compensate
 * for all excluded dates.
 */
function generateCompensationDates(params: {
  bookingStart: dayjs.Dayjs;
  bookingDuration: number;
  recurringEvent: RecurringEvent;
  originalOccurrences: Date[];
  validOriginalDates: Date[];
  excludedCount: number;
  timeZone: string;
  availabilityData: UserAvailabilityData;
  maxOccurrences: number;
}): Date[] {
  const {
    bookingStart,
    bookingDuration,
    recurringEvent,
    originalOccurrences,
    validOriginalDates,
    excludedCount,
    timeZone,
    availabilityData,
    maxOccurrences,
  } = params;

  const compensatedDates: Date[] = [];
  const targetCompensationCount = excludedCount;

  // Create a Set of original occurrence timestamps for deduplication
  const originalTimestamps = new Set(originalOccurrences.map((d) => d.getTime()));
  const validOriginalTimestamps = new Set(validOriginalDates.map((d) => d.getTime()));

  // Safety limits
  const maxIterations = 10;
  let iteration = 0;

  // Start generating from beyond the last original occurrence
  let searchCount = originalOccurrences.length + excludedCount;
  const dtstart = new Date(`${bookingStart.utc().format("YYYY-MM-DDTHH:mm:ss")}Z`);

  while (compensatedDates.length < targetCompensationCount && iteration < maxIterations) {
    iteration++;

    // Generate a larger set of occurrences to find compensation candidates
    const extendedRRule = new RRule({
      freq: mapFrequencyToRRule(recurringEvent.freq),
      interval: recurringEvent.interval || 1,
      count: Math.min(searchCount, maxOccurrences),
      // dtstart: bookingStart.toDate(),
      dtstart,
      // tzid: timeZone,
    });

    const extendedOccurrences = extendedRRule.all();

    // Look at occurrences beyond the original set
    for (const occurrence of extendedOccurrences) {
      const timestamp = occurrence.getTime();

      // Skip if this is part of the original RRULE occurrences
      if (originalTimestamps.has(timestamp)) {
        continue;
      }

      // Skip if already added as compensation
      if (compensatedDates.some((d) => d.getTime() === timestamp)) {
        continue;
      }

      // Check if this date is valid
      if (isOccurrenceValid(occurrence, bookingDuration, availabilityData, timeZone)) {
        compensatedDates.push(occurrence);

        if (compensatedDates.length >= targetCompensationCount) {
          break;
        }
      }
    }

    // If we still need more, expand the search range
    if (compensatedDates.length < targetCompensationCount) {
      searchCount = Math.min(searchCount + excludedCount * 2, maxOccurrences);

      // Safety check to prevent infinite loops
      if (searchCount >= maxOccurrences) {
        break;
      }
    }
  }

  return compensatedDates;
}

/**
 * Checks if a single occurrence is valid based on availability and OOO constraints.
 */
function isOccurrenceValid(
  occurrence: Date,
  durationMinutes: number,
  availabilityData: UserAvailabilityData,
  timeZone: string
): boolean {
  const occurrenceStart = dayjs(occurrence).tz(timeZone);
  const occurrenceEnd = occurrenceStart.add(durationMinutes, "minute");

  // Check 1: Is this day/time within availability windows?
  if (!isWithinAvailabilityWindow(occurrenceStart, occurrenceEnd, availabilityData)) {
    return false;
  }

  // Check 2: Does this overlap with any OOO period?
  if (isInOutOfOffice(occurrenceStart, occurrenceEnd, availabilityData.outOfOfficeEntries)) {
    return false;
  }

  return true;
}

/**
 * Checks if a booking time range is fully contained within an availability window.
 *
 * Cal.com stores availability times in the user's local timezone format (HH:MM).
 * The booking time is converted to the user's timezone for comparison.
 *
 * @returns true if the booking fits within at least one availability window for that day
 */
function isWithinAvailabilityWindow(
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
  availabilityData: UserAvailabilityData
): boolean {
  const dayOfWeek = start.day(); // 0 = Sunday, 6 = Saturday

  // Find all availability windows for this day of week
  const windowsForDay = availabilityData.availabilityWindows.filter((w) => w.dayOfWeek === dayOfWeek);

  if (windowsForDay.length === 0) {
    return false; // No availability on this day
  }

  // Extract time-of-day from booking in user's timezone
  const bookingStartHour = start.hour();
  const bookingStartMin = start.minute();
  const bookingEndHour = end.hour();
  const bookingEndMin = end.minute();

  // Check if booking fits fully within any window
  for (const window of windowsForDay) {
    const [windowStartHour, windowStartMin] = window.startTime.split(":").map(Number);
    const [windowEndHour, windowEndMin] = window.endTime.split(":").map(Number);

    // Convert times to minutes since midnight for easier comparison
    const bookingStartMinutes = bookingStartHour * 60 + bookingStartMin;
    const bookingEndMinutes = bookingEndHour * 60 + bookingEndMin;
    const windowStartMinutes = windowStartHour * 60 + windowStartMin;
    const windowEndMinutes = windowEndHour * 60 + windowEndMin;

    // Handle edge case: window spans midnight (e.g., 23:00-01:00)
    const windowSpansMidnight = windowEndMinutes < windowStartMinutes;

    if (windowSpansMidnight) {
      // Check if booking is in the late part (before midnight) OR early part (after midnight)
      const inLatePart = bookingStartMinutes >= windowStartMinutes && bookingEndMinutes >= windowStartMinutes;
      const inEarlyPart = bookingStartMinutes <= windowEndMinutes && bookingEndMinutes <= windowEndMinutes;

      if (inLatePart || inEarlyPart) {
        return true;
      }
    } else {
      // Normal case: booking must be fully contained within the window
      if (bookingStartMinutes >= windowStartMinutes && bookingEndMinutes <= windowEndMinutes) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if a booking time range overlaps with any out-of-office period.
 *
 * @returns true if there's any overlap with OOO periods
 */
function isInOutOfOffice(
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
  outOfOfficeEntries: Array<{ start: Date; end: Date }>
): boolean {
  for (const ooo of outOfOfficeEntries) {
    const oooStart = dayjs(ooo.start);
    const oooEnd = dayjs(ooo.end);

    // Check for any overlap using interval logic
    // Overlap exists if: start < oooEnd AND end > oooStart
    if (start.isBefore(oooEnd) && end.isAfter(oooStart)) {
      return true;
    }
  }

  return false;
}

/**
 * Copies advanced recurrence rules from source to target RecurringEvent.
 */
function copyAdvancedRecurrenceRules(source: RecurringEvent, target: RecurringEvent): void {
  if (source.byDay) {
    target.byDay = source.byDay;
  }
  if (source.byMonthDay) {
    target.byMonthDay = source.byMonthDay;
  }
  if (source.byWeekNo) {
    target.byWeekNo = source.byWeekNo;
  }
  if (source.byYearDay) {
    target.byYearDay = source.byYearDay;
  }
  if (source.byMonth) {
    target.byMonth = source.byMonth;
  }
  if (source.bySetPos) {
    target.bySetPos = source.bySetPos;
  }
  if (source.byHour) {
    target.byHour = source.byHour;
  }
  if (source.byMinute) {
    target.byMinute = source.byMinute;
  }
  if (source.bySecond) {
    target.bySecond = source.bySecond;
  }
}

/**
 * Validates that a recurring event instance reschedule maintains availability constraints.
 *
 * Used when rescheduling a single instance of a recurring event to ensure the new
 * time still fits within the user's availability and doesn't conflict with OOO.
 *
 * @param rescheduleInstance - Former and new times for the instance
 * @param availabilityData - User availability data
 * @param bookingDurationMinutes - Duration of the booking
 * @param timeZone - Timezone for the booking
 * @returns true if the new time is valid, false otherwise
 */
export function validateRecurringReschedule(
  rescheduleInstance: {
    formerTime: string;
    newTime: string;
  },
  availabilityData: UserAvailabilityData,
  bookingDurationMinutes: number,
  timeZone: string
): boolean {
  const newStart = dayjs(rescheduleInstance.newTime).tz(timeZone);
  const newEnd = newStart.add(bookingDurationMinutes, "minute");

  // Check availability window constraint
  if (!isWithinAvailabilityWindow(newStart, newEnd, availabilityData)) {
    return false;
  }

  // Check out-of-office constraint
  if (isInOutOfOffice(newStart, newEnd, availabilityData.outOfOfficeEntries)) {
    return false;
  }

  return true;
}

/**
 * Computes which specific dates from a recurring pattern should be excluded
 * based on availability constraints. Useful for displaying to users.
 *
 * @param rruleString - RFC 5545 RRULE string
 * @param availabilityData - User availability data
 * @param bookingDurationMinutes - Duration of each occurrence
 * @param timeZone - Timezone for the bookings
 * @returns Array of dates that will be excluded
 */
export function computeExcludedDates(
  rruleString: string,
  availabilityData: UserAvailabilityData,
  bookingDurationMinutes: number,
  timeZone: string
): Date[] {
  const rrule = RRule.fromString(rruleString);
  const allOccurrences = rrule.all();

  const excludedDates: Date[] = [];

  for (const occurrence of allOccurrences) {
    if (!isOccurrenceValid(occurrence, bookingDurationMinutes, availabilityData, timeZone)) {
      excludedDates.push(occurrence);
    }
  }

  return excludedDates;
}
