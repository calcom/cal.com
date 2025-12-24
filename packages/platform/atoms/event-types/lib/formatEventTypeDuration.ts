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
