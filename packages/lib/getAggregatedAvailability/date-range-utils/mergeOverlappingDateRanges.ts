import type { DateRange } from "@calcom/lib/date-ranges";

export function mergeOverlappingDateRanges(dateRanges: DateRange[]) {
  dateRanges.sort((a, b) => a.start.valueOf() - b.start.valueOf());

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
        end: currentRange.end.valueOf() > nextRange.end.valueOf() ? currentRange.end : nextRange.end,
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
    currentRange.start.valueOf() <= nextRange.start.valueOf() &&
    currentRange.end.valueOf() > nextRange.start.valueOf()
  );
}
