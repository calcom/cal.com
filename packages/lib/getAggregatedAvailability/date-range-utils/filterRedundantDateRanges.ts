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

    const rangeStart = range.start.valueOf();
    const rangeEnd = range.end.valueOf();

    for (let i = 0; i < sortedRanges.length; i++) {
      if (i === index) continue; // Skip comparing with itself

      const otherRange = sortedRanges[i];
      const otherStart = otherRange.start.valueOf();
      const otherEnd = otherRange.end.valueOf();

      if (otherEnd < otherStart) {
        continue;
      }

      if (i > index && otherStart > rangeEnd) {
        break;
      }

      if (otherStart <= rangeStart && otherEnd >= rangeEnd) {
        if (otherStart === rangeStart && otherEnd === rangeEnd && i < index) {
          return false;
        } else if (otherStart < rangeStart || otherEnd > rangeEnd) {
          return false;
        }
      }
    }

    return true;
  });
}
