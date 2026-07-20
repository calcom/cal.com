/**
 * Formats event type duration in a human-readable format.
 *
 * @param minutes - Duration in minutes (always an integer for event types)
 * @returns Formatted duration string (e.g., "30m", "1h", "1h 30m")
 *
 * @example
 * formatEventTypeDuration(30)  // "30m"
 * formatEventTypeDuration(60)  // "1h"
 * formatEventTypeDuration(90)  // "1h 30m"
 */
export function formatEventTypeDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Returns a screen-reader-friendly label for a duration.
 * Uses English prose so assistive technologies read durations correctly
 * instead of abbreviations like "30m" (misread as "30 metres").
 *
 * @example
 * formatEventTypeDurationAriaLabel(30)   // "30 minutes"
 * formatEventTypeDurationAriaLabel(60)   // "1 hour"
 * formatEventTypeDurationAriaLabel(90)   // "1 hour 30 minutes"
 */
export function formatEventTypeDurationAriaLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  const hourLabel = hours > 0 ? (hours === 1 ? "1 hour" : `${hours} hours`) : "";
  const minLabel = remainingMinutes > 0 ? (remainingMinutes === 1 ? "1 minute" : `${remainingMinutes} minutes`) : "";

  if (hourLabel && minLabel) return `${hourLabel} ${minLabel}`;
  return hourLabel || minLabel || `${minutes} minutes`;
}
