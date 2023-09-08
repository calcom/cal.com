import type { DateRange } from "@calcom/lib/date-ranges";
import { intersect } from "@calcom/lib/date-ranges";
import { SchedulingType } from "@calcom/prisma/enums";

export const getAggregatedAvailability = (
  userAvailability: { dateRanges: DateRange[]; user?: { isFixed?: boolean } }[],
  schedulingType: SchedulingType | null
): DateRange[] => {
  const fixedHosts = userAvailability.filter(
    ({ user }) => !schedulingType || schedulingType === SchedulingType.COLLECTIVE || user?.isFixed
  );

  const dateRangesToIntersect = fixedHosts.map((s) => s.dateRanges);

  const unfixedHosts = userAvailability.filter(({ user }) => user?.isFixed !== true);
  if (unfixedHosts.length) {
    dateRangesToIntersect.push(unfixedHosts.flatMap((s) => s.dateRanges));
  }

  const availability = intersect(dateRangesToIntersect);

  return mergeOverlappingDateRanges(availability);
};

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

function mergeOverlappingDateRanges(dateRanges: DateRange[]) {
  dateRanges.sort((a, b) => a.start.valueOf() - b.start.valueOf());

  const mergedDateRanges: DateRange[] = [];

  let currentRange = dateRanges[0];
  if (!currentRange) {
    return [];
  }

  for (let i = 1; i < dateRanges.length; i++) {
    const nextRange = dateRanges[i];
    if (
      isSameDay(currentRange.start.toDate(), nextRange.start.toDate()) &&
      currentRange.end.valueOf() > nextRange.start.valueOf()
    ) {
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
