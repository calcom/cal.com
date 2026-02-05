/**
 * Generic formatting utilities
 * These are reusable formatting functions used across the app
 */

/**
 * Format duration in minutes to a human-readable string
 * @param minutes - Duration in minutes (number or string)
 * @returns Formatted string like "30m", "1h", "1h 30m"
 *
 * @example
 * formatDuration(30) // "30m"
 * formatDuration(60) // "1h"
 * formatDuration(90) // "1h 30m"
 */
export const formatDuration = (minutes: number | string | undefined): string => {
  const mins = typeof minutes === "string" ? parseInt(minutes, 10) || 0 : minutes || 0;
  if (mins <= 0) return "0m";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
};

/**
 * Truncate text to a maximum length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length (default: 20)
 * @returns Truncated text with "..." if it exceeds maxLength
 *
 * @example
 * truncateTitle("Very long title here", 10) // "Very long..."
 */
export const truncateTitle = (text: string, maxLength: number = 20): string => {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

/**
 * Format an app ID to a display name
 * Converts kebab-case to Title Case
 *
 * @param appId - The app identifier (e.g., "google-meet", "cal-video")
 * @returns Formatted display name (e.g., "Google Meet", "Cal Video")
 *
 * @example
 * formatAppIdToDisplayName("google-meet") // "Google Meet"
 * formatAppIdToDisplayName("cal-video") // "Cal Video"
 */
export const formatAppIdToDisplayName = (appId: string): string => {
  return appId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
