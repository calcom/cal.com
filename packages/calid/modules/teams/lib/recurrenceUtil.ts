/**
 * RFC 5545 Recurrence Pattern Utilities
 *
 * Core utilities for working with iCalendar (RFC 5545) recurrence patterns.
 * These functions handle parsing, generating, and manipulating recurring events.
 *
 * @module recurrenceUtils
 */
import type { Weekday, Options } from "rrule";
import { RRule, RRuleSet, rrulestr, Frequency } from "rrule";

import dayjs from "@calcom/dayjs";
import type { RecurringEvent } from "@calcom/types/Calendar";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Configuration options for occurrence generation
 */
export interface GenerateOccurrencesOptions {
  /** Maximum number of occurrences to generate (default: 730) */
  maxOccurrences?: number;
  /** Start date for occurrence generation (overrides pattern DTSTART) */
  dtstart?: Date;
  /** End date limit for occurrence generation */
  until?: Date;
}

// ============================================================================
// DATE PARSING UTILITIES
// ============================================================================

/**
 * Parse RFC 5545 date format to JavaScript Date object
 * Supports multiple formats:
 * - RFC 5545 compact: YYYYMMDDTHHMMSSZ (e.g., "20250101T100000Z")
 * - ISO 8601: YYYY-MM-DDTHH:MM:SSZ (e.g., "2025-01-01T10:00:00Z")
 *
 * @param dateStr - Date string in RFC 5545 or ISO format
 * @returns Parsed Date object or null if invalid
 *
 * @example
 * parseRecurrenceDate("20250101T100000Z") // 2025-01-01 10:00:00 UTC
 * parseRecurrenceDate("2025-01-01T10:00:00Z") // 2025-01-01 10:00:00 UTC
 */
export function parseRecurrenceDate(dateStr: string): Date | null {
  try {
    let normalizedDateStr = dateStr;

    // Format: YYYYMMDDTHHMMSSZ (RFC 5545 compact format)
    if (/^\d{8}T\d{6}Z$/.test(dateStr)) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const hour = dateStr.substring(9, 11);
      const minute = dateStr.substring(11, 13);
      const second = dateStr.substring(13, 15);
      normalizedDateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    }

    const date = new Date(normalizedDateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch (error) {
    console.error("Error parsing recurrence date:", dateStr, error);
    return null;
  }
}

/**
 * Validate and parse date input (handles multiple formats)
 */
export const validateAndParseDate = (dateInput: string | Date): Date | null => {
  try {
    let date: Date;

    if (typeof dateInput === "string") {
      if (dateInput === "") {
        console.error("Empty string passed as date");
        return null;
      }

      // Handle RFC 5545 EXDATE format
      if (/^\d{8}T\d{6}Z$/.test(dateInput)) {
        const parsed = parseRecurrenceDate(dateInput);
        if (parsed) {
          return parsed;
        }
      }

      date = new Date(dateInput);
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      console.error("Invalid date input type:", typeof dateInput, dateInput);
      return null;
    }

    if (isNaN(date.getTime())) {
      console.error("Invalid date value:", dateInput);
      return null;
    }

    return date;
  } catch (error) {
    console.error("Error parsing date:", dateInput, error);
    return null;
  }
};

// ============================================================================
// OCCURRENCE COMPARISON
// ============================================================================

/**
 * Check if two dates represent the same occurrence
 * Compares dates by exact timestamp (milliseconds)
 *
 * @param date1 - First date to compare
 * @param date2 - Second date to compare
 * @returns true if dates are identical
 *
 * @example
 * const date1 = new Date("2025-01-01T10:00:00Z");
 * const date2 = new Date("2025-01-01T10:00:00Z");
 * isSameOccurrence(date1, date2); // true
 */
export function isSameOccurrence(date1: Date, date2: Date): boolean {
  return date1.getTime() === date2.getTime();
}

/**
 * Find a specific occurrence in an array of dates
 *
 * @param occurrences - Array of occurrence dates
 * @param targetDate - Date to find
 * @returns Matching date or null if not found
 *
 * @example
 * const occurrences = generateRecurringDates(pattern, startDate);
 * const occurrence = findOccurrence(occurrences, new Date("2025-01-08T10:00:00Z"));
 */
export function findOccurrence(occurrences: Date[], targetDate: Date): Date | null {
  return occurrences.find((date) => isSameOccurrence(date, targetDate)) || null;
}

// ============================================================================
// EXDATE MANIPULATION
// ============================================================================

/**
 * Add a date to the EXDATE list
 *
 * @param currentExdate - Current EXDATE string (comma-separated dates)
 * @param dateToAdd - Date to add to exclusion list
 * @returns Updated EXDATE string
 *
 * @example
 * const updated = addToExdate(
 *   "20250108T100000Z",
 *   new Date("2025-01-15T10:00:00Z")
 * );
 * // Returns: "20250108T100000Z,20250115T100000Z"
 */
export function addToExdate(currentExdate: string | undefined, dateToAdd: Date): string {
  const formattedDate = formatRecurrenceDate(dateToAdd);

  if (!currentExdate) {
    return formattedDate;
  }

  const existingDates = currentExdate.split(",").map((d) => d.trim());

  // Avoid duplicates
  if (existingDates.includes(formattedDate)) {
    return currentExdate;
  }

  return [...existingDates, formattedDate].join(",");
}

// ============================================================================
// RDATE MANIPULATION
// ============================================================================

/**
 * Add a date to the RDATE list
 *
 * @param currentRdate - Current RDATE string (comma-separated dates)
 * @param dateToAdd - Date to add to inclusion list
 * @returns Updated RDATE string
 *
 * @example
 * const updated = addToRdate(
 *   "20250108T100000Z",
 *   new Date("2025-01-15T10:00:00Z")
 * );
 * // Returns: "20250108T100000Z,20250115T100000Z"
 */
export function addToRdate(currentRdate: string | undefined, dateToAdd: Date): string {
  const formattedDate = formatRecurrenceDate(dateToAdd);

  if (!currentRdate) {
    return formattedDate;
  }

  const existingDates = currentRdate.split(",").map((d) => d.trim());

  // Avoid duplicates
  if (existingDates.includes(formattedDate)) {
    return currentRdate;
  }

  return [...existingDates, formattedDate].join(",");
}

/**
 * Remove a date from the EXDATE list
 *
 * @param currentExdate - Current EXDATE string
 * @param dateToRemove - Date to remove from exclusion list
 * @returns Updated EXDATE string (empty string if no dates remain)
 *
 * @example
 * const updated = removeFromExdate(
 *   "20250108T100000Z,20250115T100000Z",
 *   new Date("2025-01-08T10:00:00Z")
 * );
 * // Returns: "20250115T100000Z"
 */
export function removeFromExdate(currentExdate: string | undefined, dateToRemove: Date): string {
  if (!currentExdate) {
    return "";
  }

  const formattedDateToRemove = formatRecurrenceDate(dateToRemove);
  const existingDates = currentExdate.split(",").map((d) => d.trim());
  const filtered = existingDates.filter((date) => date !== formattedDateToRemove);

  return filtered.join(",");
}

/**
 * Check if a date is in the EXDATE list
 *
 * @param exdate - EXDATE string to check
 * @param date - Date to look for
 * @returns true if date is excluded
 *
 * @example
 * const isExcluded = isDateInExdate(
 *   "20250108T100000Z,20250115T100000Z",
 *   new Date("2025-01-08T10:00:00Z")
 * );
 * // Returns: true
 */
export function isDateInExdate(exdate: string | undefined, date: Date): boolean {
  if (!exdate) {
    return false;
  }

  const formattedDate = formatRecurrenceDate(date);
  const existingDates = exdate.split(",").map((d) => d.trim());
  return existingDates.includes(formattedDate);
}

// ============================================================================
// RRULE VALIDATION
// ============================================================================

/**
 * Validate an RRULE string
 *
 * @param rrule - RRULE string to validate
 * @returns Object with valid flag and optional error message
 *
 * @example
 * const result = validateRRule("FREQ=WEEKLY;COUNT=10");
 * // Returns: { valid: true }
 *
 * const result2 = validateRRule("INVALID");
 * // Returns: { valid: false, error: "..." }
 */
export function validateRRule(rrule: string): { valid: boolean; error?: string } {
  try {
    rrulestr(rrule);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid RRULE format",
    };
  }
}

/**
 * Validate a complete recurrence pattern
 *
 * @param pattern - Recurrence pattern to validate
 * @returns Object with valid flag and optional error message
 *
 * @example
 * const result = validateRecurrencePattern({
 *   RRULE: "FREQ=WEEKLY;COUNT=10",
 *   EXDATE: "20250108T100000Z"
 * });
 * // Returns: { valid: true }
 */
export function validateRecurrencePattern(pattern: RecurrencePattern): { valid: boolean; error?: string } {
  if (pattern.RRULE) {
    const rruleValidation = validateRRule(pattern.RRULE);
    if (!rruleValidation.valid) {
      return rruleValidation;
    }
  }

  if (pattern.EXRULE) {
    const exruleValidation = validateRRule(pattern.EXRULE);
    if (!exruleValidation.valid) {
      return { valid: false, error: `Invalid EXRULE: ${exruleValidation.error}` };
    }
  }

  // Validate date strings in EXDATE and RDATE
  if (pattern.EXDATE) {
    const dates = pattern.EXDATE.split(",");
    for (const dateStr of dates) {
      if (!parseRecurrenceDate(dateStr.trim())) {
        return { valid: false, error: `Invalid EXDATE date: ${dateStr}` };
      }
    }
  }

  if (pattern.RDATE) {
    const dates = pattern.RDATE.split(",");
    for (const dateStr of dates) {
      if (!parseRecurrenceDate(dateStr.trim())) {
        return { valid: false, error: `Invalid RDATE date: ${dateStr}` };
      }
    }
  }

  return { valid: true };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the count of occurrences from a recurrence pattern
 *
 * @param pattern - Recurrence pattern
 * @param startTime - Start time for generation
 * @returns Total number of occurrences
 *
 * @example
 * const count = getOccurrenceCount(
 *   { RRULE: "FREQ=WEEKLY;COUNT=10", EXDATE: "20250108T100000Z" },
 *   new Date("2025-01-01")
 * );
 * // Returns: 9 (10 - 1 excluded)
 */
export function getOccurrenceCount(pattern: RecurrencePattern, startTime: Date): number {
  const occurrences = generateRecurringDates(pattern, startTime);
  return occurrences.length;
}

/**
 * Check if a recurrence pattern has any occurrences
 *
 * @param pattern - Recurrence pattern
 * @param startTime - Start time for generation
 * @returns true if pattern generates at least one occurrence
 */
export function hasOccurrences(pattern: RecurrencePattern, startTime: Date): boolean {
  return getOccurrenceCount(pattern, startTime) > 0;
}

// ============================================================================
// RFC 5545: Parse recurrence pattern from string or object format
// ============================================================================

/**
 * Parse recurrence pattern from various formats
 * Handles both string format (RRULE:...\nEXDATE:...) and object format
 *
 * @param details - Recurrence pattern in string or object format
 * @returns Parsed recurrence pattern object
 *
 * @example
 * // String format
 * getRecurrenceObjFromString("RRULE:FREQ=WEEKLY;COUNT=10\nEXDATE:20250108T100000Z")
 * // Returns: { RRULE: "FREQ=WEEKLY;COUNT=10", EXDATE: "20250108T100000Z" }
 *
 * // Object format (already parsed)
 * getRecurrenceObjFromString({ RRULE: "FREQ=WEEKLY;COUNT=10" })
 * // Returns: { RRULE: "FREQ=WEEKLY;COUNT=10" }
 */
export function getRecurrenceObjFromString(
  details: string | { RRULE?: string; RDATE?: string; EXDATE?: string; EXRULE?: string } | undefined
): {
  RRULE?: string;
  RDATE?: string;
  EXDATE?: string;
  EXRULE?: string;
} {
  if (!details) return {};

  // If already an object, return as-is
  if (typeof details === "object") return details;

  // Parse string format (e.g., "RRULE:FREQ=WEEKLY;COUNT=10\nEXDATE:20250108T100000Z")
  const lines = details.split(/\r?\n|,/);
  const output: Record<string, string> = {};

  for (const line of lines) {
    const [key, val] = line.split(":");
    if (key && val && ["RRULE", "RDATE", "EXDATE", "EXRULE"].includes(key)) {
      output[key] = val;
    }
  }

  return output;
}

// ============================================================================

export function buildRRSetFromRE(recurringEvent: RecurringEvent, startTime?: string): RRuleSet {
  const { freq, interval = 1, count, until, byDay, byMonthDay, byMonth, exDates, rDates } = recurringEvent;

  const freqMap = getFreqMap();

  if (!freqMap[freq]) throw new Error(`Invalid frequency: ${freq}`);

  // Create RRuleSet to handle RRULE + EXDATE + RDATE
  const ruleSet = new RRuleSet();

  // Map byDay strings to RRule weekdays
  const byWeekday = byDay
    ?.map((d) => {
      const weekdayMap: Record<string, Weekday> = {
        MO: RRule.MO,
        TU: RRule.TU,
        WE: RRule.WE,
        TH: RRule.TH,
        FR: RRule.FR,
        SA: RRule.SA,
        SU: RRule.SU,
      };
      return weekdayMap[d];
    })
    .filter((day): day is Weekday => day !== undefined);

  // Prepare RRULE options
  const rruleOptions: Partial<Options> = {
    freq: freqMap[freq],
    interval,
    ...(startTime ? { dtstart: new Date(startTime) } : {}),
    ...(byWeekday && byWeekday.length > 0 ? { byweekday: byWeekday } : {}),
    ...(byMonthDay ? { bymonthday: byMonthDay } : {}),
    ...(byMonth ? { bymonth: byMonth } : {}),
  };

  // Use count if present, otherwise use until
  if (count) {
    rruleOptions.count = count;
  } else if (until) {
    rruleOptions.until = new Date(until);
  }

  // Add main RRULE
  const mainRule = new RRule(rruleOptions as Options);
  ruleSet.rrule(mainRule);

  // Add EXDATEs
  exDates?.forEach((d) => ruleSet.exdate(new Date(d)));

  // Add RDATEs
  rDates?.forEach((d) => ruleSet.rdate(new Date(d)));

  // Convert RRuleSet to array of RFC 5545 strings
  return ruleSet;
}

/**
 * buildRecurrenceRuleFromRecurrenceEvent
 *
 * @param recurringEvent - RecurringEvent object
 * @param startTime - Optional start time for DTSTART
 * @returns RRULE string
 */

export function buildRRFromRE(recurringEvent: RecurringEvent, startTime?: string): string[] {
  return buildRRSetFromRE(recurringEvent, startTime).toString().split(/\r?\n/);
}

/**
 * Generates occurrence dates from RFC 5545 recurrence rule,
 * including RDates (additional dates) and ExDates (exception dates)
 *
 * @returns Object containing active occurrences and cancelled dates (from exDates)
 */
//exdates are used to track cancelled occurrences

export function generateOccurrencesFromRRule(
  recurringEvent: RecurringEvent,
  startTime: Date
): { occurrences: Date[]; cancelledDates: Date[] } {
  try {
    const {
      freq,
      interval = 1,
      count = 1,
      until,
      byDay,
      byMonthDay,
      byMonth,
      rDates = [],
      exDates = [],
    } = recurringEvent;

    // Map string weekdays to RRule Weekday objects if provided
    const byweekday = byDay?.map((day) => RRule[day as keyof typeof RRule]) as Weekday[] | undefined;

    // Ensure startTime is treated as UTC
    const utcStartTime = new Date(
      Date.UTC(
        startTime.getUTCFullYear(),
        startTime.getUTCMonth(),
        startTime.getUTCDate(),
        startTime.getUTCHours(),
        startTime.getUTCMinutes(),
        startTime.getUTCSeconds()
      )
    );

    const rruleOptions: Partial<Options> = {
      freq,
      interval,
      count,
      dtstart: utcStartTime,
      until: until ? new Date(until) : undefined,
      byweekday,
      bymonthday: byMonthDay,
      bymonth: byMonth,
      tzid: "UTC",
    };

    const rule = new RRule(rruleOptions);

    // Generate occurrences from RRule
    const generatedDates = rule.all();

    // Convert rDates & exDates to Date objects
    const rDateObjs = rDates.map((d) => new Date(d));
    const exDateSet = new Set(exDates.map((d) => new Date(d).getTime()));

    // Combine generated + rDates, remove duplicates & exDates
    const uniqueTimestamps = new Set<number>();
    const occurrences: Date[] = [];

    for (const date of [...generatedDates, ...rDateObjs]) {
      const time = date.getTime();
      if (!exDateSet.has(time) && !uniqueTimestamps.has(time)) {
        uniqueTimestamps.add(time);
        occurrences.push(date);
      }
    }

    // Extract cancelledDates (actual excluded instances)
    const cancelledDates = [...exDateSet].map((t) => new Date(t));

    // Sort both lists for consistency
    occurrences.sort((a, b) => a.getTime() - b.getTime());
    cancelledDates.sort((a, b) => a.getTime() - b.getTime());

    return { occurrences, cancelledDates };
  } catch (error) {
    console.error("Failed to generate occurrences from RRule", { error, recurringEvent });
    return { occurrences: [], cancelledDates: [] };
  }
}

/**
 * Normalize date to start of day in given timezone for comparison
 */
export function normalizeDateForComparison(date: Date, timeZone: string): string {
  return dayjs(date).tz(timeZone).format("YYYY-MM-DD");
}
/**
 * Generate all recurring instances from an RFC 5545 recurringEvent object
 */

export function generateRecurringInstances(
  recurringEvent: RecurringEvent,
  bookingStartTime: Date | string
): Date[] {
  try {
    const MAX_OCCURRENCES = 730; // 2 years of daily occurrences
    if (!recurringEvent || typeof recurringEvent.freq === "undefined") {
      console.warn("No valid recurringEvent provided");
      return [];
    }

    if (typeof bookingStartTime === "string") {
      bookingStartTime = new Date(bookingStartTime);
    }

    // Map numeric frequency to RRule constants
    const freqMap = getFreqMap();
    const freq = freqMap[recurringEvent.freq];
    if (freq === undefined) throw new Error(`Invalid freq: ${recurringEvent.freq}`);

    const dtstart = recurringEvent.dtstart ? new Date(recurringEvent.dtstart) : new Date(bookingStartTime);

    const rruleOptions: any = {
      freq,
      dtstart,
      interval: recurringEvent.interval || 1,
    };

    // Add count or until, but not both
    if (recurringEvent.count) {
      rruleOptions.count = recurringEvent.count;
    } else if (recurringEvent.until) {
      rruleOptions.until = new Date(recurringEvent.until);
    } else {
      // Default to MAX_OCCURRENCES if neither count nor until is specified
      rruleOptions.count = MAX_OCCURRENCES;
    }

    const rrule = new RRule(rruleOptions);
    const allInstances = rrule.all();

    // Handle excluded dates (if any)
    const exdates = (recurringEvent.exDates || []).map((d) => new Date(d));
    const exdateTimestamps = new Set(exdates.map((d) => d.getTime()));

    // Handle rDates (if any)
    const rdates = (recurringEvent.rDates || []).map((d) => new Date(d));

    // Combine and remove duplicates using timestamps
    const combined = [...allInstances, ...rdates];
    const uniqueTimestamps = new Set<number>();
    const uniqueInstances: Date[] = [];

    for (const date of combined) {
      const time = date.getTime();
      if (!exdateTimestamps.has(time) && !uniqueTimestamps.has(time)) {
        uniqueTimestamps.add(time);
        uniqueInstances.push(date);
      }
    }

    // Sort by ascending date order
    uniqueInstances.sort((a, b) => a.getTime() - b.getTime());

    return uniqueInstances;
  } catch (error) {
    console.error("Error generating recurring instances", { error, recurringEvent });
    throw new Error("Failed to generate recurring instances");
  }
}

function getFreqMap(): Record<number, Frequency> {
  return {
    0: RRule.YEARLY,
    1: RRule.MONTHLY,
    2: RRule.WEEKLY,
    3: RRule.DAILY,
  };
}

/**
 * Format a Date object to RFC 5545 compact format
 *
 * @param date - JavaScript Date object
 * @returns Date string in YYYYMMDDTHHMMSSZ format
 *
 * @example
 * formatRecurrenceDate(new Date("2025-01-01T10:00:00Z")) // "20250101T100000Z"
 */
export function formatRecurrenceDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

/**
 * Converts your Frequency enum to RRule frequency
 */
const frequencyToRRule = (freq: Frequency): RRuleFrequency => {
  const freqMap: Record<number, RRuleFrequency> = {
    [Frequency.YEARLY]: RRule.YEARLY,
    [Frequency.MONTHLY]: RRule.MONTHLY,
    [Frequency.WEEKLY]: RRule.WEEKLY,
    [Frequency.DAILY]: RRule.DAILY,
    [Frequency.HOURLY]: RRule.HOURLY,
    [Frequency.MINUTELY]: RRule.MINUTELY,
    [Frequency.SECONDLY]: RRule.SECONDLY,
  };
  return freqMap[freq] || RRule.WEEKLY;
};

/**
 * Converts weekday strings to RRule weekday objects
 */
const weekdayToRRule = (day: string) => {
  const dayMap: Record<string, any> = {
    MO: RRule.MO,
    TU: RRule.TU,
    WE: RRule.WE,
    TH: RRule.TH,
    FR: RRule.FR,
    SA: RRule.SA,
    SU: RRule.SU,
  };
  return dayMap[day.toUpperCase()];
};

/**
 * Ensures the input is a valid Date object
 */
export const toDate = (date: Date | string | dayjs.Dayjs): Date => {
  if (date instanceof Date) {
    return date;
  }
  if (dayjs.isDayjs(date)) {
    return date.toDate();
  }
  return dayjs(date).toDate();
};

/**
 * Gets the actual first occurrence start time for a recurring event
 * @param recurringEvent - The recurring event configuration
 * @param masterStartTime - The master booking start time
 * @returns The actual first occurrence date/time
 */
export const getActualRecurringStartTime = (
  recurringEvent: RecurringEvent,
  masterStartTime: Date | string | dayjs.Dayjs
): Date => {
  const dtstart = recurringEvent.dtstart ? toDate(recurringEvent.dtstart) : toDate(masterStartTime);

  // Build RRule options
  const rruleOptions: any = {
    freq: frequencyToRRule(recurringEvent.freq),
    dtstart: dtstart,
    interval: recurringEvent.interval || 1,
  };

  // Add optional parameters
  if (recurringEvent.count) {
    rruleOptions.count = recurringEvent.count;
  }
  if (recurringEvent.until) {
    rruleOptions.until = toDate(recurringEvent.until);
  }
  if (recurringEvent.tzid) {
    rruleOptions.tzid = recurringEvent.tzid;
  }
  if (recurringEvent.byDay && recurringEvent.byDay.length > 0) {
    rruleOptions.byweekday = recurringEvent.byDay.map(weekdayToRRule).filter(Boolean);
  }
  if (recurringEvent.byMonthDay && recurringEvent.byMonthDay.length > 0) {
    rruleOptions.bymonthday = recurringEvent.byMonthDay;
  }
  if (recurringEvent.byWeekNo && recurringEvent.byWeekNo.length > 0) {
    rruleOptions.byweekno = recurringEvent.byWeekNo;
  }
  if (recurringEvent.byYearDay && recurringEvent.byYearDay.length > 0) {
    rruleOptions.byyearday = recurringEvent.byYearDay;
  }
  if (recurringEvent.byMonth && recurringEvent.byMonth.length > 0) {
    rruleOptions.bymonth = recurringEvent.byMonth;
  }
  if (recurringEvent.bySetPos && recurringEvent.bySetPos.length > 0) {
    rruleOptions.bysetpos = recurringEvent.bySetPos;
  }
  if (recurringEvent.byHour && recurringEvent.byHour.length > 0) {
    rruleOptions.byhour = recurringEvent.byHour;
  }
  if (recurringEvent.byMinute && recurringEvent.byMinute.length > 0) {
    rruleOptions.byminute = recurringEvent.byMinute;
  }
  if (recurringEvent.bySecond && recurringEvent.bySecond.length > 0) {
    rruleOptions.bysecond = recurringEvent.bySecond;
  }

  try {
    const rrule = new RRule(rruleOptions);

    // Get occurrences (limit to first 100 for performance)
    let occurrences = rrule.all((date, i) => i < 100);

    // Add rDates if they exist
    if (recurringEvent.rDates && recurringEvent.rDates.length > 0) {
      const additionalDates = recurringEvent.rDates.map(toDate);
      occurrences = [...occurrences, ...additionalDates].sort((a, b) => a.getTime() - b.getTime());
    }

    // Filter out exDates
    if (recurringEvent.exDates && recurringEvent.exDates.length > 0) {
      const exDateTimes = recurringEvent.exDates.map((d) => dayjs(toDate(d)).valueOf());
      occurrences = occurrences.filter(
        (occurrence) => !exDateTimes.some((exDateTime) => dayjs(occurrence).valueOf() === exDateTime)
      );
    }

    // Return the first valid occurrence or fallback to master start time
    return occurrences[0] || toDate(masterStartTime);
  } catch (error) {
    console.error("Error generating recurring occurrences:", error);
    return toDate(masterStartTime);
  }
};

export function validateRecurringInstance(
  recurringEvent: RecurringEvent,
  instanceDate: Date,
  bookingStartTime: Date
): {
  isValid: boolean;
  error?: string;
  isPast?: boolean;
} {
  try {
    // Generate all occurrences
    const occurrences = generateRecurringInstances(recurringEvent, bookingStartTime);

    if (occurrences.length === 0) {
      return { isValid: false, error: "No occurrences could be generated from recurring event" };
    }

    // Check if the instance date matches any occurrence (with 1 minute tolerance for timezone differences)
    const instanceTime = instanceDate.getTime();
    const matchingOccurrence = occurrences.find((occurrence) => {
      const diff = Math.abs(occurrence.getTime() - instanceTime);
      return diff < 60000; // 1 minute tolerance
    });

    if (!matchingOccurrence) {
      return {
        isValid: false,
        error: "The specified instance date is not part of the recurring event series",
      };
    }

    // Check if the instance is in the past
    const now = new Date();
    const isPast = instanceDate < now;

    return {
      isValid: true,
      isPast,
    };
  } catch (error) {
    console.error("Error validating recurring instance:", error);
    return {
      isValid: false,
      error: "Failed to validate recurring instance",
    };
  }
}
