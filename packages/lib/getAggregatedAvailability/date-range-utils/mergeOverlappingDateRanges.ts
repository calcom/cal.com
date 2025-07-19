import type { DateRange } from "@calcom/lib/date-ranges";

export function mergeOverlappingDateRanges(dateRanges: DateRange[]) {
  dateRanges.sort((a, b) => a.start.getTime() - b.start.getTime());

  const mergedDateRanges: DateRange[] = [];

  let currentRange = dateRanges[0];
  if (!currentRange) {
    return [];
  }

  for (let i = 1; i < dateRanges.length; i++) {
    const nextRange = dateRanges[i];

    if (isCurrentRangeOverlappingNext(currentRange, nextRange)) {
      currentRange = {
        start: currentRange.start,
        end: currentRange.end.getTime() > nextRange.end.getTime() ? currentRange.end : nextRange.end,
      };
    } else {
      mergedDateRanges.push(currentRange);
      currentRange = nextRange;
    }
  }
  mergedDateRanges.push(currentRange);

  return mergedDateRanges;
}

function isCurrentRangeOverlappingNext(currentRange: DateRange, nextRange: DateRange): boolean {
  return (
    currentRange.start.getTime() <= nextRange.start.getTime() &&
    currentRange.end.getTime() > nextRange.start.getTime()
  );
}
