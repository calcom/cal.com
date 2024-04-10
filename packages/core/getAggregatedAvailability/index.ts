import type { DateRange } from "@calcom/lib/date-ranges";
import { intersect } from "@calcom/lib/date-ranges";
import { SchedulingType } from "@calcom/prisma/enums";

import { mergeOverlappingDateRanges } from "./date-range-utils/mergeOverlappingDateRanges";

export const getAggregatedAvailability = (
  userAvailability: {
    dateRanges: DateRange[];
    dateRangesWithoutOOO: DateRange[];
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

  const dateRangesToIntersect = fixedHosts.map((s) => (!isTeamEvent ? s.dateRanges : s.dateRangesWithoutOOO));

  const unfixedHosts = userAvailability.filter(({ user }) => user?.isFixed !== true);
  if (unfixedHosts.length) {
    dateRangesToIntersect.push(
      unfixedHosts.flatMap((s) => (!isTeamEvent ? s.dateRanges : s.dateRangesWithoutOOO))
    );
  }

  const availability = intersect(dateRangesToIntersect);

  return mergeOverlappingDateRanges(availability);
};
