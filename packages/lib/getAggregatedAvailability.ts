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
    user?: { isFixed?: boolean; groupId?: string };
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
    // Group round robin hosts by their groupId
    const hostsByGroup: Record<string, typeof roundRobinHosts> = {};

    roundRobinHosts.forEach((host) => {
      const groupId = host.user?.groupId || "default_group_id";
      if (!hostsByGroup[groupId]) {
        hostsByGroup[groupId] = [];
      }
      hostsByGroup[groupId].push(host);
    });

    // at least one host from each group needs to be available
    Object.values(hostsByGroup).forEach((groupHosts) => {
      if (groupHosts.length > 0) {
        const groupDateRanges = groupHosts.flatMap((s) =>
          !isTeamEvent ? s.dateRanges : s.oooExcludedDateRanges
        );
        if (groupDateRanges.length > 0) {
          dateRangesToIntersect.push(groupDateRanges);
        }
      }
    });
  }

  const availability = intersect(dateRangesToIntersect);

  const uniqueRanges = uniqueAndSortedDateRanges(availability);

  return filterRedundantDateRanges(uniqueRanges);
};
