import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";

/**
 * Enhanced timezone utilities for proper IANA timezone handling with DST support.
 * This module ensures that timezone operations use IANA zone conversion instead of
 * numeric offset calculations, which is critical for handling DST transitions correctly.
 */

/**
 * Converts a UTC time to a specific IANA timezone using proper timezone rules.
 * This function ensures DST transitions are handled correctly for zones like America/Santiago.
 *
 * @param utcTime - The UTC time to convert (ISO string, Date, or Dayjs object)
 * @param targetTimezone - IANA timezone identifier (e.g., "America/Santiago")
 * @returns Dayjs object in the target timezone
 */
export function convertUtcToTimezone(utcTime: string | Date | Dayjs, targetTimezone: string): Dayjs {
  // Always start with UTC and convert to target timezone using IANA rules
  const utcDayjs = dayjs.utc(utcTime);
  return utcDayjs.tz(targetTimezone);
}

/**
 * Converts a time from one IANA timezone to another, preserving DST rules.
 * This is safer than offset-based conversions for DST-observing timezones.
 *
 * @param time - The time to convert (ISO string, Date, or Dayjs object)
 * @param fromTimezone - Source IANA timezone identifier
 * @param toTimezone - Target IANA timezone identifier
 * @returns Dayjs object in the target timezone
 */
export function convertBetweenTimezones(
  time: string | Date | Dayjs,
  fromTimezone: string,
  toTimezone: string
): Dayjs {
  // Parse the time in the source timezone, then convert to target
  const sourceTime = dayjs.tz(time, fromTimezone);
  return sourceTime.tz(toTimezone);
}

/**
 * Gets the current UTC offset for a timezone at a specific date.
 * This correctly handles DST transitions by using IANA rules rather than assumptions.
 *
 * @param timezone - IANA timezone identifier
 * @param date - Optional date to check offset for (defaults to now)
 * @returns UTC offset in minutes
 */
export function getTimezoneOffset(timezone: string, date?: string | Date | Dayjs): number {
  const targetDate = date ? dayjs(date) : dayjs();
  return targetDate.tz(timezone).utcOffset();
}

/**
 * Checks if a timezone observes DST by comparing January and July offsets.
 * This is more reliable than hardcoded lists for determining DST observance.
 *
 * @param timezone - IANA timezone identifier
 * @param year - Optional year to check (defaults to current year)
 * @returns true if the timezone observes DST
 */
export function timezoneSupportsDst(timezone: string, year?: number): boolean {
  const checkYear = year || new Date().getFullYear();
  const january = dayjs.tz(`${checkYear}-01-01T12:00:00`, timezone);
  const july = dayjs.tz(`${checkYear}-07-01T12:00:00`, timezone);

  return january.utcOffset() !== july.utcOffset();
}

/**
 * Gets the DST offset difference for a timezone (how much the offset changes during DST).
 * For most timezones this is 60 minutes, but some (like Lord Howe Island) use 30 minutes.
 *
 * @param timezone - IANA timezone identifier
 * @param year - Optional year to check (defaults to current year)
 * @returns DST offset difference in minutes
 */
export function getDstOffsetDifference(timezone: string, year?: number): number {
  if (!timezoneSupportsDst(timezone, year)) {
    return 0;
  }

  const checkYear = year || new Date().getFullYear();
  const january = dayjs.tz(`${checkYear}-01-01T12:00:00`, timezone);
  const july = dayjs.tz(`${checkYear}-07-01T12:00:00`, timezone);

  return Math.abs(july.utcOffset() - january.utcOffset());
}

/**
 * Determines if a specific date/time falls within DST for a given timezone.
 * This is crucial for scheduling applications to show correct local times.
 *
 * @param datetime - The date/time to check
 * @param timezone - IANA timezone identifier
 * @returns true if the datetime falls within DST period
 */
export function isDateInDst(datetime: string | Date | Dayjs, timezone: string): boolean {
  if (!timezoneSupportsDst(timezone)) {
    return false;
  }

  const targetTime = dayjs.tz(datetime, timezone);
  const year = targetTime.year();

  // Get standard (winter) offset by checking January
  const standardOffset = dayjs.tz(`${year}-01-01T12:00:00`, timezone).utcOffset();
  const currentOffset = targetTime.utcOffset();

  // If current offset is different from standard, we're in DST
  return currentOffset !== standardOffset;
}

/**
 * Safely converts a dayjs object to start/end of day in a specific timezone.
 * This ensures that DST transitions don't cause incorrect day boundaries.
 *
 * @param date - Date to convert (will be treated as start of day in the timezone)
 * @param timezone - IANA timezone identifier
 * @returns Object with startOfDay and endOfDay in the specified timezone
 */
export function getDayBoundariesInTimezone(date: string | Date | Dayjs, timezone: string) {
  // Parse the date and ensure it's in the target timezone
  const targetDate = dayjs.tz(date, timezone);

  const startOfDay = targetDate.startOf("day");
  const endOfDay = targetDate.endOf("day");

  return {
    startOfDay,
    endOfDay,
  };
}

/**
 * Formats a time for display in a specific timezone, ensuring DST is handled correctly.
 * This should be used instead of offset-based formatting for user-facing time displays.
 *
 * @param time - Time to format
 * @param timezone - IANA timezone identifier
 * @param format - dayjs format string (default: "YYYY-MM-DD HH:mm:ss")
 * @returns Formatted time string in the target timezone
 */
export function formatTimeInTimezone(
  time: string | Date | Dayjs,
  timezone: string,
  format = "YYYY-MM-DD HH:mm:ss"
): string {
  return convertUtcToTimezone(time, timezone).format(format);
}

/**
 * Creates a time in a specific timezone while preserving the wall clock time.
 * This is useful for creating availability slots that should appear at the same
 * local time regardless of DST transitions.
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @param timeString - Time string in HH:mm or HH:mm:ss format
 * @param timezone - IANA timezone identifier
 * @returns Dayjs object representing the local time in the timezone
 */
export function createTimeInTimezone(dateString: string, timeString: string, timezone: string): Dayjs {
  const dateTimeString = `${dateString}T${timeString}`;
  return dayjs.tz(dateTimeString, timezone);
}

/**
 * Validates that a timezone string is a valid IANA timezone identifier.
 * This should be used to validate user input before timezone operations.
 *
 * @param timezone - Timezone string to validate
 * @returns true if the timezone is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    dayjs().tz(timezone);
    return true;
  } catch {
    return false;
  }
}
