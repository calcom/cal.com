/**
 * Notifications Configuration
 *
 * Centralized settings for local notifications (mobile only).
 * Values can be overridden via EXPO_PUBLIC_ prefixed environment variables.
 */

// Helper to parse environment variable to number with fallback
const getEnvNumber = (key: string, fallback: number): number => {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return fallback;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const DEFAULT_BOOKING_REMINDER_MINUTES = 10;

/**
 * Minutes before booking start when the reminder should fire.
 *
 * Override with EXPO_PUBLIC_BOOKING_REMINDER_MINUTES.
 */
export const BOOKING_REMINDER_MINUTES = getEnvNumber(
  "EXPO_PUBLIC_BOOKING_REMINDER_MINUTES",
  DEFAULT_BOOKING_REMINDER_MINUTES
);
