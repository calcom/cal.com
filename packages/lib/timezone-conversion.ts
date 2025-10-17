import dayjs from "@calcom/dayjs";
import { timeZoneWithDST, getDSTDifference } from "@calcom/lib/dayjs";

/**
 * Converts a UTC timestamp to a specific timezone while properly handling DST transitions.
 * This function ensures that the displayed time is accurate even during DST changes.
 *
 * @param utcTime - The UTC time string, Date object, or Dayjs object
 * @param targetTimezone - The target timezone (e.g., 'Europe/Berlin')
 * @returns A dayjs object in the target timezone
 */
export function convertUTCToTimezone(utcTime: string | Date | dayjs.Dayjs, targetTimezone: string) {
  if (!targetTimezone) {
    return dayjs.utc(utcTime);
  }

  const utcMoment = dayjs.utc(utcTime);

  // Check if timezone is valid first
  let hasDST = false;
  try {
    hasDST = timeZoneWithDST(targetTimezone);
  } catch (error) {
    // If timezone is invalid, fall back to UTC instance (no tz conversion)
    console.warn(`Invalid timezone ${targetTimezone}, falling back to UTC:`, error);
    return utcMoment;
  }

  // If the timezone doesn't observe DST, use simple conversion
  if (!hasDST) {
    return utcMoment.tz(targetTimezone);
  }

  // For DST-observing timezones, we need to be more careful
  const convertedTime = utcMoment.tz(targetTimezone);

  // Check if this date falls on a DST transition day
  const year = convertedTime.year();

  // Get the DST difference for this timezone
  const dstDifference = getDSTDifference(targetTimezone);

  if (dstDifference !== 0) {
    // This timezone observes DST, so we need to ensure proper handling
    // The dayjs library should handle most cases correctly, but we add validation

    // Verify that the conversion is reasonable
    const expectedOffset = convertedTime.utcOffset();
    const standardOffset = dayjs.tz(`${year}-01-01T00:00:00`, targetTimezone).utcOffset();
    const dstOffset = dayjs.tz(`${year}-07-01T00:00:00`, targetTimezone).utcOffset();

    // If the current offset doesn't match either standard or DST offset,
    // there might be an issue with the conversion
    if (expectedOffset !== standardOffset && expectedOffset !== dstOffset) {
      console.warn(`Unexpected timezone offset for ${targetTimezone} on ${convertedTime.format()}`);
    }
  }

  return convertedTime;
}

/**
 * Formats a time for display while ensuring DST accuracy.
 * This is a wrapper around the standard formatTime function that adds DST awareness.
 *
 * @param time - The time to format (UTC string, Date, or Dayjs object)
 * @param timeFormat - 12 or 24 hour format
 * @param timezone - The target timezone
 * @returns Formatted time string
 */
export function formatTimeWithDST(
  time: string | Date | dayjs.Dayjs,
  timeFormat?: number | null,
  timezone?: string | null
): string {
  if (!timezone) {
    return dayjs(time).format(timeFormat === 12 ? "h:mma" : "HH:mm");
  }

  try {
    // Use our DST-aware conversion
    const convertedTime = convertUTCToTimezone(time, timezone);
    return convertedTime.format(timeFormat === 12 ? "h:mma" : "HH:mm");
  } catch (error) {
    // Fallback to original method if conversion fails, preserving timezone
    console.warn(`Timezone conversion failed for ${timezone}:`, error);
    return dayjs(time)
      .tz(timezone)
      .format(timeFormat === 12 ? "h:mma" : "HH:mm");
  }
}

/**
 * Checks if a given date/time is on a DST transition day for the specified timezone.
 *
 * @param date - The date to check
 * @param timezone - The timezone to check
 * @returns true if the date is on a DST transition day
 */
export function isDSTTransitionDay(date: dayjs.Dayjs, timezone: string): boolean {
  if (!timeZoneWithDST(timezone)) return false;
  const start = date.tz(timezone).startOf("day");
  const end = date.tz(timezone).endOf("day");
  return start.utcOffset() !== end.utcOffset();
}

/**
 * Gets the correct timezone offset for a specific date and timezone,
 * accounting for DST transitions.
 *
 * @param date - The date to get the offset for
 * @param timezone - The timezone
 * @returns The offset in minutes from UTC
 */
export function getTimezoneOffset(date: dayjs.Dayjs, timezone: string): number {
  const dateInTimezone = date.tz(timezone);
  return dateInTimezone.utcOffset();
}
