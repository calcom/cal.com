/** Expand the start date to the beginning of the current month */
export const getTimeMin = (timeMin?: string) => {
  const date = timeMin ? new Date(timeMin) : new Date();
  // Set to UTC to avoid timezone issues
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  result.setUTCHours(0, 0, 0, 0);
  return result.toISOString();
};

/**
 * Expand the end date to the start of the overnext month if date
 * is between start of current month and end of next month,
 * otherwise return start of overnext month from the passed date
 * @example
 * Today: March 15, 2024 ▼-------------▼ getTimeMax returns May 1st 00:00:00
 *                   Mar      Apr      May      Jun
 *                   ├────────┼────────┼────────┼────────┤
 * Current Month     █████████|        |        |        |
 * Next Month        |        █████████|        |        |
 **/
export function getTimeMax(timeMax?: string) {
  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();

  if (!timeMax) {
    // If no date passed, return start of the overnext month from current date
    const result = new Date(Date.UTC(currentYear, currentMonth + 2, 1));
    result.setUTCHours(0, 0, 0, 0);
    return result.toISOString();
  }

  const date = new Date(timeMax);
  const dateMonth = date.getUTCMonth();
  const dateYear = date.getUTCFullYear();

  // If the date is within current month or next month, return start of overnext month
  // Otherwise, return start of overnext month from the date
  let targetYear = dateYear;
  let targetMonth = dateMonth;

  // Check if date is within current month or next month
  const isWithinCurrentOrNextMonth =
    (dateYear === currentYear && dateMonth <= currentMonth + 1) ||
    (dateYear === currentYear + 1 && currentMonth === 11 && dateMonth === 0);

  if (isWithinCurrentOrNextMonth) {
    // For dates within current month or next month, return start of overnext month
    targetMonth = dateMonth + 2;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear++;
    }
  } else {
    // For dates beyond overnext month, return start of overnext month from the date
    targetMonth = dateMonth + 2;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear++;
    }
  }

  const result = new Date(Date.UTC(targetYear, targetMonth, 1));
  result.setUTCHours(0, 0, 0, 0);
  return result.toISOString();
}
