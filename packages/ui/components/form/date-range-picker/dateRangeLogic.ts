export type DateRange = {
  startDate?: Date;
  endDate?: Date;
};

export type CalculateNewDateRangeParams = {
  startDate?: Date;
  endDate?: Date;
  clickedDate: Date;
};

/**
 * Determines the new date range based on user's date selection.
 * Implements Airbnb-style date range selection behavior.
 *
 * @param params - Object containing startDate, endDate, and clickedDate
 * @returns The new date range state
 */
export function calculateNewDateRange({
  startDate,
  endDate,
  clickedDate,
}: CalculateNewDateRangeParams): DateRange {
  // Airbnb-style: when both dates are set, any click starts a new range
  if (!startDate || endDate) {
    // No start date OR both dates set -> start fresh
    return { startDate: clickedDate, endDate: undefined };
  } else {
    // Have start but no end -> complete the range (swap if needed)
    if (clickedDate < startDate) {
      return { startDate: clickedDate, endDate: startDate };
    } else {
      return { startDate: startDate, endDate: clickedDate };
    }
  }
}
