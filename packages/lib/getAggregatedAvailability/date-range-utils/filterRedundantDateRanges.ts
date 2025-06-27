import type { DateRange } from "@calcom/lib/date-ranges";

/**
 * Filters out date ranges that are completely covered by other date ranges.
 * Unlike mergeOverlappingDateRanges, this doesn't merge overlapping ranges,
 * it only removes ranges that are completely contained within others.
 */
export function filterRedundantDateRanges(dateRanges: DateRange[]): DateRange[] {
  if (dateRanges.length <= 1) return dateRanges;

  const sortedRanges = [...dateRanges].sort((a, b) => a.start.valueOf() - b.start.valueOf());

  return sortedRanges.filter((range, index) => {
    if (range.end.valueOf() < range.start.valueOf()) {
      return true;
    }

    for (let i = 0; i < sortedRanges.length; i++) {
      if (i === index) continue; // Skip comparing with itself

      const otherRange = sortedRanges[i];

      if (otherRange.end.valueOf() < otherRange.start.valueOf()) {
        continue;
      }

      if (
        otherRange.start.valueOf() <= range.start.valueOf() &&
        otherRange.end.valueOf() >= range.end.valueOf()
      ) {
        return false; // This range is redundant, filter it out
      }
    }

    return true; // Keep this range
  });
}
