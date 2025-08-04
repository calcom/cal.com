import type { DateRange } from "@calcom/lib/date-ranges";
import { intersect } from "@calcom/lib/date-ranges";
import { SchedulingType } from "@calcom/prisma/enums";

import { filterRedundantDateRanges } from "./getAggregatedAvailability/date-range-utils/filterRedundantDateRanges";
import { mergeOverlappingDateRanges } from "./getAggregatedAvailability/date-range-utils/mergeOverlappingDateRanges";

function uniqueAndSortedDateRanges(ranges: DateRange[]): DateRange[] {
  const seen = new Set<string>();

  return ranges
    .sort((a, b) => {
      const startDiff = a.start.valueOf() - b.start.valueOf();
      return startDiff !== 0 ? startDiff : a.end.valueOf() - b.end.valueOf();
    })
    .filter((range) => {
      const key = `${range.start.valueOf()}-${range.end.valueOf()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export const getAggregatedAvailability = (
  userAvailability: {
    dateRanges: DateRange[];
    oooExcludedDateRanges: DateRange[];
    user?: { isFixed?: boolean };
  }[],
  schedulingType: SchedulingType | null
): DateRange[] => {
  const isTeamEvent =
    schedulingType === SchedulingType.COLLECTIVE ||
    schedulingType === SchedulingType.ROUND_ROBIN ||
    userAvailability.length > 1;

  const fixedHosts = userAvailability.filter(
    ({ user }) => !schedulingType || schedulingType === SchedulingType.COLLECTIVE || user?.isFixed
  );

  const fixedDateRanges = mergeOverlappingDateRanges(
    intersect(fixedHosts.map((s) => (!isTeamEvent ? s.dateRanges : s.oooExcludedDateRanges)))
  );
  const dateRangesToIntersect = !!fixedDateRanges.length ? [fixedDateRanges] : [];
  const roundRobinHosts = userAvailability.filter(({ user }) => user?.isFixed !== true);
  if (roundRobinHosts.length) {
    dateRangesToIntersect.push(
      roundRobinHosts.flatMap((s) => (!isTeamEvent ? s.dateRanges : s.oooExcludedDateRanges))
    );
  }
  const availability = intersect(dateRangesToIntersect);

  const uniqueRanges = uniqueAndSortedDateRanges(availability);

  return filterRedundantDateRanges(uniqueRanges);
};
