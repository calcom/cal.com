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

  // If no date is passed, return start of the month two months from *now*.
  if (!timeMax) {
    const result = new Date(Date.UTC(currentYear, currentMonth + 2, 1));
    result.setUTCHours(0, 0, 0, 0);
    return result.toISOString();
  }

  // If a date is passed, determine the base month/year for calculation.
  const date = new Date(timeMax);
  const dateMonth = date.getUTCMonth();
  const dateYear = date.getUTCFullYear();

  let baseYear = currentYear;
  let baseMonth = currentMonth;

  // Check if date is within the current month or the next two months relative to *now*.
  const isWithinCurrentOrNextTwoMonths =
    (dateYear === currentYear && dateMonth <= currentMonth + 2) ||
    (dateYear === currentYear + 1 &&
      ((currentMonth === 10 && dateMonth === 0) || (currentMonth === 11 && dateMonth <= 1)));

  // If the input date is beyond the next two months relative to *now*,
  // use the *input date's* month/year as the base.
  if (!isWithinCurrentOrNextTwoMonths) {
    baseYear = dateYear;
    baseMonth = dateMonth;
  }
  // Otherwise, the base remains the current year/month.

  // Calculate the start of the month two months after the determined base date.
  const result = new Date(Date.UTC(baseYear, baseMonth + 2, 1));
  result.setUTCHours(0, 0, 0, 0);
  return result.toISOString();
}
