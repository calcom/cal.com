import type { Dayjs } from "@calcom/dayjs";

/**
 * Gets the start of the week for a given date based on the user's preferred week start day.
 * This is useful when dayjs's built-in startOf('week') doesn't respect user preferences.
 *
 * @param date - The date to get the week start for
 * @param weekStart - The day the week starts on (0 = Sunday, 1 = Monday, etc.)
 * @returns The start of the week as a dayjs object
 *
 * @example
 * // If today is Thursday (day 4) and user prefers Monday start (1):
 * const weekStart = getWeekStart(dayjs(), 1); // Returns the Monday of current week
 */
export const getWeekStart = (date: Dayjs, weekStart: number = 0): Dayjs => {
  const currentDay = date.day();
  const diff = (currentDay - weekStart + 7) % 7;
  return date.subtract(diff, "day").startOf("day");
};
